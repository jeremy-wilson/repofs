var _ = require('lodash');
var Immutable = require('immutable');


var CacheUtils = require('../lib/utils/cache');
var TreeEntry = require('../lib/models/treeEntry');
var Branch = require('../lib/models/branch');
var Blob = require('../lib/models/blob');
var WorkingState = require('../lib/models/workingState');
var RepositoryState = require('../lib/models/repositoryState');


// Return empty repo with single master branch
function emptyRepo() {
    var masterBranch = new Branch({
        name: 'master',
        sha: 'masterSha',
        remote: ''
    });

    var workingState = new WorkingState({
        head: 'sha.working.master',
        treeEntries: new Immutable.Map()
    });

    return new RepositoryState({
        currentBranchName: 'master',
        workingStates: new Immutable.Map().set(masterBranch.getName(), workingState),
        branches: new Immutable.List().push(masterBranch)
        // No cache
    });
}

// Adds a file to the repo, with content equal to filepath.
// options.fetched for already fetched in cache
// options.branch to specify a branch
// options.content to specify content
function addFile(repoState, filepath, options) {
    options = _.defaults({}, options || {}, {
        branch: repoState.getCurrentBranchName(),
        fetched: true,
        content: filepath
    });
    options.branch = repoState.getBranch(options.branch);

    var treeEntry = new TreeEntry({
        blobSize: options.content.length,
        sha: 'sha.'+options.content,
        mode: '100644'
    });
    var resultState = repoState;

    // Update working state
    var workingState = resultState.getWorkingStateForBranch(options.branch);
    workingState = workingState
        .set('treeEntries', workingState
             .getTreeEntries().set(filepath, treeEntry));

    var workingStates = resultState.getWorkingStates();
    resultState = resultState
        .set('workingStates', workingStates
             .set(options.branch.getFullName(), workingState));

    // Update cache
    if(options.fetched) {
        var cache = repoState.getCache();
        cache = CacheUtils.addBlob(
            cache,
            'sha.'+options.content,
            Blob.createFromString(options.content)
        );
        resultState = resultState.set('cache', cache);
    }
    return resultState;
}


// Creates a clean repoState for a default book with branches and files already fetched
// * SUMMARY.md "# Summary"
// * README.md "# Introduction"
function defaultBook() {
    var resultState = emptyRepo();
    resultState = addFile(resultState, 'README.md', {
        content: '# Introduction'
    });
    resultState = addFile(resultState, 'SUMMARY.md', {
        content: '# Summary'
    });
    return resultState;
}

// Creates a nested directory structure for testing (already fetched)
// file.root
// dir.twoItems/file1
// dir.twoItems/file2
// dir.deep.oneItem/file1
// dir.deep.oneItem/dir.oneItem/file1
function directoryStructure(pathList) {
    return pathList.reduce(function (repo, path) {
        return addFile(repo, path);
    }, emptyRepo());
}

// Make a big repo with 'n' files each in a directory at 'depth'
function bigFileList(n, depth) {
    depth = depth || 1;
    var indexes = Immutable.Range(1, n);
    return indexes.map(function (index) {
        var depths = Immutable.Range(0, depth);
        return depths.map(function (depth) {
            return index+'.'+depth;
        }).toArray().join('/');
    }).toArray();
}

module.exports = {
    emptyRepo: emptyRepo,
    DEFAULT_BOOK: defaultBook(),
    bigFileList: bigFileList,
    addFile: addFile,
    directoryStructure: directoryStructure
};
