var CHANGES = require('../constants/changeTypes');

var arrayBuffer = require('./arrayBuffer');
var error = require('./error');
var RepoUtils = require('./repo');
var ChangeUtils = require('./change');

// Read content of a file, returns an ArrayBuffer
function readFile(repoState, filename) {
    var workingState = repoState.getCurrentState();
    var caches = repoState.getCache();
    var changes = workingState.getChanges();
    var change = changes.getEntry(filename);

    // File has been modified?
    if (change) {
        if (change.getType() == CHANGES.REMOVE) {
            throw error.fileNotFound(filename);
        }

        return change.getContent();
    }

    var tree = workingState.getTree();
    var treeEntry = tree.getEntry(filename);

    // File entry does not exists
    if (!treeEntry) {
        throw error.fileNotFound(filename);
    }

    // Get content from cache
    return caches.getBlob(treeEntry.getSHA());
}

// Read content of a file, returns a String
function readFileAsString(repoState, filename, encoding) {
    encoding = encoding || 'utf8';
    var buffer = readFile(repoState, filename);
    return arrayBuffer.enforceString(buffer, encoding);
}

// Push a new change
function pushChange(repoState, filename, type, content) {
    var workingState = repoState.getCurrentState();

    // Push changes to list
    var changes = workingState.getChanges();
    changes = ChangeUtils.pushChange(changes, filename, type, content);

    // Update workingState and repoState
    workingState = workingState.set('changes', changes);

    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

// Create a new file
function createFile(repoState, filename, content) {
    return pushChange(repoState, filename, {
        type: CHANGES.CREATE,
        content: content
    });
}

// Write a file
function writeFile(repoState, filename, content) {
    return pushChange(repoState, filename, {
        type: CHANGES.UPDATE,
        content: content
    });
}

// Remove a file
function removeFile(repoState, filename) {
    return pushChange(repoState, filename, {
        type: CHANGES.REMOVE
    });
}

// Rename a file
function moveFile(repoState, filename, newFilename) {
    var workingState = repoState.getCurrentState();
    var changes = workingState.getChanges();
    var tree = workingState.getTree();
    var treeEntry = tree.getEntry(filename);

    // File entry does not exists
    if (!treeEntry) {
        throw error.fileNotFound(filename);
    }

    // Create new file
    changes = ChangeUtils.pushChange(changes, filename, {
        type: CHANGES.CREATE,
        sha: treeEntry.getSHA()
    });

    // Remove old one
    changes = ChangeUtils.pushChange(changes, filename, {
        type: CHANGES.REMOVE
    });

    workingState = workingState.set('changes', changes);

    return RepoUtils.updateCurrentWorkingState(repoState, workingState);
}

module.exports = {
    read: readFile,
    readAsString: readFileAsString,
    create: createFile,
    write: writeFile,
    remove: removeFile,
    move: moveFile
};