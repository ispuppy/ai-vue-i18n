import require$$0 from 'node:path';
import require$$1 from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * @fileoverview The main file for the humanfs package.
 * @author Nicholas C. Zakas
 */

/* global URL, TextDecoder, TextEncoder */

//-----------------------------------------------------------------------------
// Types
//-----------------------------------------------------------------------------

/** @typedef {import("@humanfs/types").HfsImpl} HfsImpl */
/** @typedef {import("@humanfs/types").HfsDirectoryEntry} HfsDirectoryEntry */
/** @typedef {import("@humanfs/types").HfsWalkEntry} HfsWalkEntry */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/**
 * Error to represent when a method is missing on an impl.
 */
class NoSuchMethodError extends Error {
	/**
	 * Creates a new instance.
	 * @param {string} methodName The name of the method that was missing.
	 */
	constructor(methodName) {
		super(`Method "${methodName}" does not exist on impl.`);
	}
}

/**
 * Error to represent when a method is not supported on an impl. This happens
 * when a method on `Hfs` is called with one name and the corresponding method
 * on the impl has a different name. (Example: `text()` and `bytes()`.)
 */
class MethodNotSupportedError extends Error {
	/**
	 * Creates a new instance.
	 * @param {string} methodName The name of the method that was missing.
	 */
	constructor(methodName) {
		super(`Method "${methodName}" is not supported on this impl.`);
	}
}

/**
 * Error to represent when an impl is already set.
 */
class ImplAlreadySetError extends Error {
	/**
	 * Creates a new instance.
	 */
	constructor() {
		super(`Implementation already set.`);
	}
}

/**
 * Asserts that the given path is a valid file path.
 * @param {any} fileOrDirPath The path to check.
 * @returns {void}
 * @throws {TypeError} When the path is not a non-empty string.
 */
function assertValidFileOrDirPath(fileOrDirPath) {
	if (
		!fileOrDirPath ||
		(!(fileOrDirPath instanceof URL) && typeof fileOrDirPath !== "string")
	) {
		throw new TypeError("Path must be a non-empty string or URL.");
	}
}

/**
 * Asserts that the given file contents are valid.
 * @param {any} contents The contents to check.
 * @returns {void}
 * @throws {TypeError} When the contents are not a string or ArrayBuffer.
 */
function assertValidFileContents(contents) {
	if (
		typeof contents !== "string" &&
		!(contents instanceof ArrayBuffer) &&
		!ArrayBuffer.isView(contents)
	) {
		throw new TypeError(
			"File contents must be a string, ArrayBuffer, or ArrayBuffer view.",
		);
	}
}

/**
 * Converts the given contents to Uint8Array.
 * @param {any} contents The data to convert.
 * @returns {Uint8Array} The converted Uint8Array.
 * @throws {TypeError} When the contents are not a string or ArrayBuffer.
 */
function toUint8Array(contents) {
	if (contents instanceof Uint8Array) {
		return contents;
	}

	if (typeof contents === "string") {
		return encoder.encode(contents);
	}

	if (contents instanceof ArrayBuffer) {
		return new Uint8Array(contents);
	}

	if (ArrayBuffer.isView(contents)) {
		const bytes = contents.buffer.slice(
			contents.byteOffset,
			contents.byteOffset + contents.byteLength,
		);
		return new Uint8Array(bytes);
	}
	throw new TypeError(
		"Invalid contents type. Expected string or ArrayBuffer.",
	);
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * A class representing a log entry.
 */
class LogEntry {
	/**
	 * The type of log entry.
	 * @type {string}
	 */
	type;

	/**
	 * The data associated with the log entry.
	 * @type {any}
	 */
	data;

	/**
	 * The time at which the log entry was created.
	 * @type {number}
	 */
	timestamp = Date.now();

	/**
	 * Creates a new instance.
	 * @param {string} type The type of log entry.
	 * @param {any} [data] The data associated with the log entry.
	 */
	constructor(type, data) {
		this.type = type;
		this.data = data;
	}
}

/**
 * A class representing a file system utility library.
 * @implements {HfsImpl}
 */
class Hfs {
	/**
	 * The base implementation for this instance.
	 * @type {HfsImpl}
	 */
	#baseImpl;

	/**
	 * The current implementation for this instance.
	 * @type {HfsImpl}
	 */
	#impl;

	/**
	 * A map of log names to their corresponding entries.
	 * @type {Map<string,Array<LogEntry>>}
	 */
	#logs = new Map();

	/**
	 * Creates a new instance.
	 * @param {object} options The options for the instance.
	 * @param {HfsImpl} options.impl The implementation to use.
	 */
	constructor({ impl }) {
		this.#baseImpl = impl;
		this.#impl = impl;
	}

	/**
	 * Logs an entry onto all currently open logs.
	 * @param {string} methodName The name of the method being called.
	 * @param {...*} args The arguments to the method.
	 * @returns {void}
	 */
	#log(methodName, ...args) {
		for (const logs of this.#logs.values()) {
			logs.push(new LogEntry("call", { methodName, args }));
		}
	}

	/**
	 * Starts a new log with the given name.
	 * @param {string} name The name of the log to start;
	 * @returns {void}
	 * @throws {Error} When the log already exists.
	 * @throws {TypeError} When the name is not a non-empty string.
	 */
	logStart(name) {
		if (!name || typeof name !== "string") {
			throw new TypeError("Log name must be a non-empty string.");
		}

		if (this.#logs.has(name)) {
			throw new Error(`Log "${name}" already exists.`);
		}

		this.#logs.set(name, []);
	}

	/**
	 * Ends a log with the given name and returns the entries.
	 * @param {string} name The name of the log to end.
	 * @returns {Array<LogEntry>} The entries in the log.
	 * @throws {Error} When the log does not exist.
	 */
	logEnd(name) {
		if (this.#logs.has(name)) {
			const logs = this.#logs.get(name);
			this.#logs.delete(name);
			return logs;
		}

		throw new Error(`Log "${name}" does not exist.`);
	}

	/**
	 * Determines if the current implementation is the base implementation.
	 * @returns {boolean} True if the current implementation is the base implementation.
	 */
	isBaseImpl() {
		return this.#impl === this.#baseImpl;
	}

	/**
	 * Sets the implementation for this instance.
	 * @param {object} impl The implementation to use.
	 * @returns {void}
	 */
	setImpl(impl) {
		this.#log("implSet", impl);

		if (this.#impl !== this.#baseImpl) {
			throw new ImplAlreadySetError();
		}

		this.#impl = impl;
	}

	/**
	 * Resets the implementation for this instance back to its original.
	 * @returns {void}
	 */
	resetImpl() {
		this.#log("implReset");
		this.#impl = this.#baseImpl;
	}

	/**
	 * Asserts that the given method exists on the current implementation.
	 * @param {string} methodName The name of the method to check.
	 * @returns {void}
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 */
	#assertImplMethod(methodName) {
		if (typeof this.#impl[methodName] !== "function") {
			throw new NoSuchMethodError(methodName);
		}
	}

	/**
	 * Asserts that the given method exists on the current implementation, and if not,
	 * throws an error with a different method name.
	 * @param {string} methodName The name of the method to check.
	 * @param {string} targetMethodName The name of the method that should be reported
	 *  as an error when methodName does not exist.
	 * @returns {void}
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 */
	#assertImplMethodAlt(methodName, targetMethodName) {
		if (typeof this.#impl[methodName] !== "function") {
			throw new MethodNotSupportedError(targetMethodName);
		}
	}

	/**
	 * Calls the given method on the current implementation.
	 * @param {string} methodName The name of the method to call.
	 * @param {...any} args The arguments to the method.
	 * @returns {any} The return value from the method.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 */
	#callImplMethod(methodName, ...args) {
		this.#log(methodName, ...args);
		this.#assertImplMethod(methodName);
		return this.#impl[methodName](...args);
	}

	/**
	 * Calls the given method on the current implementation and doesn't log the call.
	 * @param {string} methodName The name of the method to call.
	 * @param {...any} args The arguments to the method.
	 * @returns {any} The return value from the method.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 */
	#callImplMethodWithoutLog(methodName, ...args) {
		this.#assertImplMethod(methodName);
		return this.#impl[methodName](...args);
	}

	/**
	 * Calls the given method on the current implementation but logs a different method name.
	 * @param {string} methodName The name of the method to call.
	 * @param {string} targetMethodName The name of the method to log.
	 * @param {...any} args The arguments to the method.
	 * @returns {any} The return value from the method.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 */
	#callImplMethodAlt(methodName, targetMethodName, ...args) {
		this.#log(targetMethodName, ...args);
		this.#assertImplMethodAlt(methodName, targetMethodName);
		return this.#impl[methodName](...args);
	}

	/**
	 * Reads the given file and returns the contents as text. Assumes UTF-8 encoding.
	 * @param {string|URL} filePath The file to read.
	 * @returns {Promise<string|undefined>} The contents of the file.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the file path is not a non-empty string.
	 */
	async text(filePath) {
		assertValidFileOrDirPath(filePath);

		const result = await this.#callImplMethodAlt("bytes", "text", filePath);
		return result ? decoder.decode(result) : undefined;
	}

	/**
	 * Reads the given file and returns the contents as JSON. Assumes UTF-8 encoding.
	 * @param {string|URL} filePath The file to read.
	 * @returns {Promise<any|undefined>} The contents of the file as JSON.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {SyntaxError} When the file contents are not valid JSON.
	 * @throws {TypeError} When the file path is not a non-empty string.
	 */
	async json(filePath) {
		assertValidFileOrDirPath(filePath);

		const result = await this.#callImplMethodAlt("bytes", "json", filePath);
		return result ? JSON.parse(decoder.decode(result)) : undefined;
	}

	/**
	 * Reads the given file and returns the contents as an ArrayBuffer.
	 * @param {string|URL} filePath The file to read.
	 * @returns {Promise<ArrayBuffer|undefined>} The contents of the file as an ArrayBuffer.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the file path is not a non-empty string.
	 * @deprecated Use bytes() instead.
	 */
	async arrayBuffer(filePath) {
		assertValidFileOrDirPath(filePath);

		const result = await this.#callImplMethodAlt(
			"bytes",
			"arrayBuffer",
			filePath,
		);
		return result?.buffer;
	}

	/**
	 * Reads the given file and returns the contents as an Uint8Array.
	 * @param {string|URL} filePath The file to read.
	 * @returns {Promise<Uint8Array|undefined>} The contents of the file as an Uint8Array.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the file path is not a non-empty string.
	 */
	async bytes(filePath) {
		assertValidFileOrDirPath(filePath);
		return this.#callImplMethod("bytes", filePath);
	}

	/**
	 * Writes the given data to the given file. Creates any necessary directories along the way.
	 * If the data is a string, UTF-8 encoding is used.
	 * @param {string|URL} filePath The file to write.
	 * @param {string|ArrayBuffer|ArrayBufferView} contents The data to write.
	 * @returns {Promise<void>} A promise that resolves when the file is written.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the file path is not a non-empty string.
	 */
	async write(filePath, contents) {
		assertValidFileOrDirPath(filePath);
		assertValidFileContents(contents);
		this.#log("write", filePath, contents);

		let value = toUint8Array(contents);
		return this.#callImplMethodWithoutLog("write", filePath, value);
	}

	/**
	 * Appends the given data to the given file. Creates any necessary directories along the way.
	 * If the data is a string, UTF-8 encoding is used.
	 * @param {string|URL} filePath The file to append to.
	 * @param {string|ArrayBuffer|ArrayBufferView} contents The data to append.
	 * @returns {Promise<void>} A promise that resolves when the file is appended to.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the file path is not a non-empty string.
	 * @throws {TypeError} When the file contents are not a string or ArrayBuffer.
	 * @throws {Error} When the file cannot be appended to.
	 */
	async append(filePath, contents) {
		assertValidFileOrDirPath(filePath);
		assertValidFileContents(contents);
		this.#log("append", filePath, contents);

		let value = toUint8Array(contents);
		return this.#callImplMethodWithoutLog("append", filePath, value);
	}

	/**
	 * Determines if the given file exists.
	 * @param {string|URL} filePath The file to check.
	 * @returns {Promise<boolean>} True if the file exists.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the file path is not a non-empty string.
	 */
	async isFile(filePath) {
		assertValidFileOrDirPath(filePath);
		return this.#callImplMethod("isFile", filePath);
	}

	/**
	 * Determines if the given directory exists.
	 * @param {string|URL} dirPath The directory to check.
	 * @returns {Promise<boolean>} True if the directory exists.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the directory path is not a non-empty string.
	 */
	async isDirectory(dirPath) {
		assertValidFileOrDirPath(dirPath);
		return this.#callImplMethod("isDirectory", dirPath);
	}

	/**
	 * Creates the given directory.
	 * @param {string|URL} dirPath The directory to create.
	 * @returns {Promise<void>} A promise that resolves when the directory is created.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the directory path is not a non-empty string.
	 */
	async createDirectory(dirPath) {
		assertValidFileOrDirPath(dirPath);
		return this.#callImplMethod("createDirectory", dirPath);
	}

	/**
	 * Deletes the given file or empty directory.
	 * @param {string|URL} filePath The file to delete.
	 * @returns {Promise<boolean>} A promise that resolves when the file or
	 *   directory is deleted, true if the file or directory is deleted, false
	 *   if the file or directory does not exist.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the file path is not a non-empty string.
	 */
	async delete(filePath) {
		assertValidFileOrDirPath(filePath);
		return this.#callImplMethod("delete", filePath);
	}

	/**
	 * Deletes the given file or directory recursively.
	 * @param {string|URL} dirPath The directory to delete.
	 * @returns {Promise<boolean>} A promise that resolves when the file or
	 *   directory is deleted, true if the file or directory is deleted, false
	 *   if the file or directory does not exist.
	 * @throws {NoSuchMethodError} When the method does not exist on the current implementation.
	 * @throws {TypeError} When the directory path is not a non-empty string.
	 */
	async deleteAll(dirPath) {
		assertValidFileOrDirPath(dirPath);
		return this.#callImplMethod("deleteAll", dirPath);
	}

	/**
	 * Returns a list of directory entries for the given path.
	 * @param {string|URL} dirPath The path to the directory to read.
	 * @returns {AsyncIterable<HfsDirectoryEntry>} A promise that resolves with the
	 *   directory entries.
	 * @throws {TypeError} If the directory path is not a string or URL.
	 * @throws {Error} If the directory cannot be read.
	 */
	async *list(dirPath) {
		assertValidFileOrDirPath(dirPath);
		yield* await this.#callImplMethod("list", dirPath);
	}

	/**
	 * Walks a directory using a depth-first traversal and returns the entries
	 * from the traversal.
	 * @param {string|URL} dirPath The path to the directory to walk.
	 * @param {Object} [options] The options for the walk.
	 * @param {(entry:HfsWalkEntry) => Promise<boolean>|boolean} [options.directoryFilter] A filter function to determine
	 * 	if a directory's entries should be included in the walk.
	 * @param {(entry:HfsWalkEntry) => Promise<boolean>|boolean} [options.entryFilter] A filter function to determine if
	 * 	an entry should be included in the walk.
	 * @returns {AsyncIterable<HfsWalkEntry>} A promise that resolves with the
	 * 	directory entries.
	 * @throws {TypeError} If the directory path is not a string or URL.
	 * @throws {Error} If the directory cannot be read.
	 */
	async *walk(
		dirPath,
		{ directoryFilter = () => true, entryFilter = () => true } = {},
	) {
		assertValidFileOrDirPath(dirPath);
		this.#log("walk", dirPath, { directoryFilter, entryFilter });

		// inner function for recursion without additional logging
		const walk = async function* (
			dirPath,
			{ directoryFilter, entryFilter, parentPath = "", depth = 1 },
		) {
			let dirEntries;

			try {
				dirEntries = await this.#callImplMethodWithoutLog(
					"list",
					dirPath,
				);
			} catch (error) {
				// if the directory does not exist then return an empty array
				if (error.code === "ENOENT") {
					return;
				}

				// otherwise, rethrow the error
				throw error;
			}

			for await (const listEntry of dirEntries) {
				const walkEntry = {
					path: listEntry.name,
					depth,
					...listEntry,
				};

				if (parentPath) {
					walkEntry.path = `${parentPath}/${walkEntry.path}`;
				}

				// first emit the entry but only if the entry filter returns true
				let shouldEmitEntry = entryFilter(walkEntry);
				if (shouldEmitEntry.then) {
					shouldEmitEntry = await shouldEmitEntry;
				}

				if (shouldEmitEntry) {
					yield walkEntry;
				}

				// if it's a directory then yield the entry and walk the directory
				if (listEntry.isDirectory) {
					// if the directory filter returns false, skip the directory
					let shouldWalkDirectory = directoryFilter(walkEntry);
					if (shouldWalkDirectory.then) {
						shouldWalkDirectory = await shouldWalkDirectory;
					}

					if (!shouldWalkDirectory) {
						continue;
					}

					// make sure there's a trailing slash on the directory path before appending
					const directoryPath =
						dirPath instanceof URL
							? new URL(
									listEntry.name,
									dirPath.href.endsWith("/")
										? dirPath.href
										: `${dirPath.href}/`,
								)
							: `${dirPath.endsWith("/") ? dirPath : `${dirPath}/`}${listEntry.name}`;

					yield* walk(directoryPath, {
						directoryFilter,
						entryFilter,
						parentPath: walkEntry.path,
						depth: depth + 1,
					});
				}
			}
		}.bind(this);

		yield* walk(dirPath, { directoryFilter, entryFilter });
	}

	/**
	 * Returns the size of the given file.
	 * @param {string|URL} filePath The path to the file to read.
	 * @returns {Promise<number>} A promise that resolves with the size of the file.
	 * @throws {TypeError} If the file path is not a string or URL.
	 * @throws {Error} If the file cannot be read.
	 */
	async size(filePath) {
		assertValidFileOrDirPath(filePath);
		return this.#callImplMethod("size", filePath);
	}

	/**
	 * Returns the last modified timestamp of the given file or directory.
	 * @param {string|URL} fileOrDirPath The path to the file or directory.
	 * @returns {Promise<Date|undefined>} A promise that resolves with the last modified date
	 *  or undefined if the file or directory does not exist.
	 * @throws {TypeError} If the path is not a string or URL.
	 */
	async lastModified(fileOrDirPath) {
		assertValidFileOrDirPath(fileOrDirPath);
		return this.#callImplMethod("lastModified", fileOrDirPath);
	}

	/**
	 * Copys a file from one location to another.
	 * @param {string|URL} source The path to the file to copy.
	 * @param {string|URL} destination The path to the new file.
	 * @returns {Promise<void>} A promise that resolves when the file is copied.
	 * @throws {TypeError} If the file path is not a string or URL.
	 * @throws {Error} If the file cannot be copied.
	 */
	async copy(source, destination) {
		assertValidFileOrDirPath(source);
		assertValidFileOrDirPath(destination);
		return this.#callImplMethod("copy", source, destination);
	}

	/**
	 * Copies a file or directory from one location to another.
	 * @param {string|URL} source The path to the file or directory to copy.
	 * @param {string|URL} destination The path to copy the file or directory to.
	 * @returns {Promise<void>} A promise that resolves when the file or directory is
	 * copied.
	 * @throws {TypeError} If the directory path is not a string or URL.
	 * @throws {Error} If the directory cannot be copied.
	 */
	async copyAll(source, destination) {
		assertValidFileOrDirPath(source);
		assertValidFileOrDirPath(destination);
		return this.#callImplMethod("copyAll", source, destination);
	}

	/**
	 * Moves a file from the source path to the destination path.
	 * @param {string|URL} source The location of the file to move.
	 * @param {string|URL} destination The destination of the file to move.
	 * @returns {Promise<void>} A promise that resolves when the move is complete.
	 * @throws {TypeError} If the file or directory paths are not strings.
	 * @throws {Error} If the file or directory cannot be moved.
	 */
	async move(source, destination) {
		assertValidFileOrDirPath(source);
		assertValidFileOrDirPath(destination);
		return this.#callImplMethod("move", source, destination);
	}

	/**
	 * Moves a file or directory from one location to another.
	 * @param {string|URL} source The path to the file or directory to move.
	 * @param {string|URL} destination The path to move the file or directory to.
	 * @returns {Promise<void>} A promise that resolves when the file or directory is
	 * moved.
	 * @throws {TypeError} If the source is not a string or URL.
	 * @throws {TypeError} If the destination is not a string or URL.
	 * @throws {Error} If the file or directory cannot be moved.
	 */
	async moveAll(source, destination) {
		assertValidFileOrDirPath(source);
		assertValidFileOrDirPath(destination);
		return this.#callImplMethod("moveAll", source, destination);
	}
}

// @ts-self-types="./retrier.d.ts"
/**
 * @fileoverview A utility for retrying failed async method calls.
 */

/* global setTimeout, clearTimeout */

//-----------------------------------------------------------------------------
// Constants
//-----------------------------------------------------------------------------

const MAX_TASK_TIMEOUT = 60000;
const MAX_TASK_DELAY = 100;
const MAX_CONCURRENCY = 1000;

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Logs a message to the console if the DEBUG environment variable is set.
 * @param {string} message The message to log.
 * @returns {void}
 */
function debug(message) {
    if (globalThis?.process?.env.DEBUG === "@hwc/retry") {
        console.debug(message);
    }
}

/*
 * The following logic has been extracted from graceful-fs.
 *
 * The ISC License
 *
 * Copyright (c) 2011-2023 Isaac Z. Schlueter, Ben Noordhuis, and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
 * IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/**
 * Checks if it is time to retry a task based on the timestamp and last attempt time.
 * @param {RetryTask} task The task to check.
 * @param {number} maxDelay The maximum delay for the queue.
 * @returns {boolean} true if it is time to retry, false otherwise.
 */
function isTimeToRetry(task, maxDelay) {
    const timeSinceLastAttempt = Date.now() - task.lastAttempt;
    const timeSinceStart = Math.max(task.lastAttempt - task.timestamp, 1);
    const desiredDelay = Math.min(timeSinceStart * 1.2, maxDelay);

    return timeSinceLastAttempt >= desiredDelay;
}

/**
 * Checks if it is time to bail out based on the given timestamp.
 * @param {RetryTask} task The task to check.
 * @param {number} timeout The timeout for the queue.
 * @returns {boolean} true if it is time to bail, false otherwise.
 */
function isTimeToBail(task, timeout) {
    return task.age > timeout;
}

/**
 * Creates a new promise with resolve and reject functions.
 * @returns {{promise:Promise<any>, resolve:(value:any) => any, reject: (value:any) => any}} A new promise.
 */
function createPromise() {
    if (Promise.withResolvers) {
        return Promise.withResolvers();
    }

    let resolve, reject;

    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });

    if (resolve === undefined || reject === undefined) {
        throw new Error("Promise executor did not initialize resolve or reject.");
    }

    return { promise, resolve, reject };
}


/**
 * A class to represent a task in the retry queue.
 */
class RetryTask {

    /**
     * The unique ID for the task.
     * @type {string}
     */
    id = Math.random().toString(36).slice(2);

    /**
     * The function to call.
     * @type {Function}
     */
    fn;

    /**
     * The error that was thrown.
     * @type {Error}
     */
    error;
    
    /**
     * The timestamp of the task.
     * @type {number}
     */
    timestamp = Date.now();

    /**
     * The timestamp of the last attempt.
     * @type {number}
     */
    lastAttempt = this.timestamp;

    /**
     * The resolve function for the promise.
     * @type {Function}
     */
    resolve;

    /**
     * The reject function for the promise.
     * @type {Function}
     */
    reject;

    /**
     * The AbortSignal to monitor for cancellation.
     * @type {AbortSignal|undefined}
     */
    signal;

    /**
     * Creates a new instance.
     * @param {Function} fn The function to call.
     * @param {Error} error The error that was thrown.
     * @param {Function} resolve The resolve function for the promise.
     * @param {Function} reject The reject function for the promise.
     * @param {AbortSignal|undefined} signal The AbortSignal to monitor for cancellation.
     */
    constructor(fn, error, resolve, reject, signal) {
        this.fn = fn;
        this.error = error;
        this.timestamp = Date.now();
        this.lastAttempt = Date.now();
        this.resolve = resolve;
        this.reject = reject;
        this.signal = signal;
    }
    
    /**
     * Gets the age of the task.
     * @returns {number} The age of the task in milliseconds.
     * @readonly
     */
    get age() {
        return Date.now() - this.timestamp;
    }
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * A class that manages a queue of retry jobs.
 */
class Retrier {

    /**
     * Represents the queue for processing tasks.
     * @type {Array<RetryTask>}
     */
    #retrying = [];

    /**
     * Represents the queue for pending tasks.
     * @type {Array<Function>}
     */
    #pending = [];

    /**
     * The number of tasks currently being processed.
     * @type {number}
     */
    #working = 0;

    /**
     * The timeout for the queue.
     * @type {number}
     */
    #timeout;

    /**
     * The maximum delay for the queue.
     * @type {number}
     */
    #maxDelay;

    /**
     * The setTimeout() timer ID.
     * @type {NodeJS.Timeout|undefined}
     */
    #timerId;

    /**
     * The function to call.
     * @type {Function}
     */
    #check;

    /**
     * The maximum number of concurrent tasks.
     * @type {number}
     */
    #concurrency;

    /**
     * Creates a new instance.
     * @param {Function} check The function to call.
     * @param {object} [options] The options for the instance.
     * @param {number} [options.timeout] The timeout for the queue.
     * @param {number} [options.maxDelay] The maximum delay for the queue.
     * @param {number} [options.concurrency] The maximum number of concurrent tasks.
     */
    constructor(check, { timeout = MAX_TASK_TIMEOUT, maxDelay = MAX_TASK_DELAY, concurrency = MAX_CONCURRENCY } = {}) {

        if (typeof check !== "function") {
            throw new Error("Missing function to check errors");
        }

        this.#check = check;
        this.#timeout = timeout;
        this.#maxDelay = maxDelay;
        this.#concurrency = concurrency;
    }

    /**
     * Gets the number of tasks waiting to be retried.
     * @returns {number} The number of tasks in the retry queue.
     */
    get retrying() {
        return this.#retrying.length;
    }

    /**
     * Gets the number of tasks waiting to be processed in the pending queue.
     * @returns {number} The number of tasks in the pending queue.
     */
    get pending() {
        return this.#pending.length;
    }

    /**
     * Gets the number of tasks currently being processed.
     * @returns {number} The number of tasks currently being processed.
     */
    get working() {
        return this.#working;
    }

    /**
     * Calls the function and retries if it fails.
     * @param {Function} fn The function to call.
     * @param {Object} options The options for the job.
     * @param {AbortSignal} [options.signal] The AbortSignal to monitor for cancellation.
     * @param {Promise<any>} options.promise The promise to return when the function settles.
     * @param {Function} options.resolve The resolve function for the promise.
     * @param {Function} options.reject The reject function for the promise.
     * @returns {Promise<any>} A promise that resolves when the function is
     * called successfully.
     */
    #call(fn, { signal, promise, resolve, reject }) {

        let result;

        try {
            result = fn();
        } catch (/** @type {any} */ error) {
            reject(new Error(`Synchronous error: ${error.message}`, { cause: error }));
            return promise;
        }

        // if the result is not a promise then reject an error
        if (!result || typeof result.then !== "function") {
            reject(new Error("Result is not a promise."));
            return promise;
        }

        this.#working++;
        promise.finally(() => {
            this.#working--;
            this.#processPending();
        })
        // `promise.finally` creates a new promise that may be rejected, so it must be handled.
            .catch(() => { });

        // call the original function and catch any ENFILE or EMFILE errors
        Promise.resolve(result)
            .then(value => {
                debug("Function called successfully without retry.");
                resolve(value);
            })
            .catch(error => {
                if (!this.#check(error)) {
                    reject(error);
                    return;
                }

                const task = new RetryTask(fn, error, resolve, reject, signal);
                
                debug(`Function failed, queuing for retry with task ${task.id}.`);
                this.#retrying.push(task);

                signal?.addEventListener("abort", () => {
                    debug(`Task ${task.id} was aborted due to AbortSignal.`);
                    reject(signal.reason);
                });

                this.#processQueue();
            });
        
        return promise;
    }

    /**
     * Adds a new retry job to the queue.
     * @template {(...args: unknown[]) => Promise<unknown>} Func
     * @template {Awaited<ReturnType<Func>>} RetVal
     * @param {Func} fn The function to call.
     * @param {object} [options] The options for the job.
     * @param {AbortSignal} [options.signal] The AbortSignal to monitor for cancellation.
     * @returns {Promise<RetVal>} A promise that resolves when the queue is processed.
     */
    retry(fn, { signal } = {}) {

        signal?.throwIfAborted();

        const { promise, resolve, reject } = createPromise();

        this.#pending.push(() => this.#call(fn, { signal, promise, resolve, reject }));
        this.#processPending();
        
        return promise;
    }


    /**
     * Processes the pending queue and the retry queue.
     * @returns {void}
     */
    #processAll() {
        if (this.pending) {
            this.#processPending();
        }

        if (this.retrying) {
            this.#processQueue();
        }
    }

    /**
     * Processes the pending queue to see which tasks can be started.
     * @returns {void}
     */
    #processPending() {

        debug(`Processing pending tasks: ${this.pending} pending, ${this.working} working.`);

        const available = this.#concurrency - this.working;

        if (available <= 0) {
            return;
        }

        const count = Math.min(this.pending, available);

        for (let i = 0; i < count; i++) {
            const task = this.#pending.shift();
            task?.();
        }

        debug(`Processed pending tasks: ${this.pending} pending, ${this.working} working.`);
    }

    /**
     * Processes the queue.
     * @returns {void}
     */
    #processQueue() {
        // clear any timer because we're going to check right now
        clearTimeout(this.#timerId);
        this.#timerId = undefined;

        debug(`Processing retry queue: ${this.retrying} retrying, ${this.working} working.`);

        const processAgain = () => {
            this.#timerId = setTimeout(() => this.#processAll(), 0);
        };

        // if there's nothing in the queue, we're done
        const task = this.#retrying.shift();
        if (!task) {
            debug("Queue is empty, exiting.");

            if (this.pending) {
                processAgain();
            }
            return;
        }

        // if it's time to bail, then bail
        if (isTimeToBail(task, this.#timeout)) {
            debug(`Task ${task.id} was abandoned due to timeout.`);
            task.reject(task.error);
            processAgain();
            return;
        }

        // if it's not time to retry, then wait and try again
        if (!isTimeToRetry(task, this.#maxDelay)) {
            debug(`Task ${task.id} is not ready to retry, skipping.`);
            this.#retrying.push(task);
            processAgain();
            return;
        }

        // otherwise, try again
        task.lastAttempt = Date.now();
        
        // Promise.resolve needed in case it's a thenable but not a Promise
        Promise.resolve(task.fn())
            // @ts-ignore because we know it's any
            .then(result => {
                debug(`Task ${task.id} succeeded after ${task.age}ms.`);
                task.resolve(result);
            })

            // @ts-ignore because we know it's any
            .catch(error => {
                if (!this.#check(error)) {
                    debug(`Task ${task.id} failed with non-retryable error: ${error.message}.`);
                    task.reject(error);
                    return;
                }

                // update the task timestamp and push to back of queue to try again
                task.lastAttempt = Date.now();
                this.#retrying.push(task);
                debug(`Task ${task.id} failed, requeueing to try again.`);
            })
            .finally(() => {
                this.#processAll();
            });
    }
}

/**
 * @fileoverview The main file for the hfs package.
 * @author Nicholas C. Zakas
 */
/* global Buffer:readonly, URL */


//-----------------------------------------------------------------------------
// Constants
//-----------------------------------------------------------------------------

const RETRY_ERROR_CODES = new Set(["ENFILE", "EMFILE"]);

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * A class representing a directory entry.
 * @implements {HfsDirectoryEntry}
 */
class NodeHfsDirectoryEntry {
	/**
	 * The name of the directory entry.
	 * @type {string}
	 */
	name;

	/**
	 * True if the entry is a file.
	 * @type {boolean}
	 */
	isFile;

	/**
	 * True if the entry is a directory.
	 * @type {boolean}
	 */
	isDirectory;

	/**
	 * True if the entry is a symbolic link.
	 * @type {boolean}
	 */
	isSymlink;

	/**
	 * Creates a new instance.
	 * @param {Dirent} dirent The directory entry to wrap.
	 */
	constructor(dirent) {
		this.name = dirent.name;
		this.isFile = dirent.isFile();
		this.isDirectory = dirent.isDirectory();
		this.isSymlink = dirent.isSymbolicLink();
	}
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * A class representing the Node.js implementation of Hfs.
 * @implements {HfsImpl}
 */
class NodeHfsImpl {
	/**
	 * The file system module to use.
	 * @type {Fsp}
	 */
	#fsp;

	/**
	 * The retryer object used for retrying operations.
	 * @type {Retrier}
	 */
	#retrier;

	/**
	 * Creates a new instance.
	 * @param {object} [options] The options for the instance.
	 * @param {Fsp} [options.fsp] The file system module to use.
	 */
	constructor({ fsp = require$$1 } = {}) {
		this.#fsp = fsp;
		this.#retrier = new Retrier(error => RETRY_ERROR_CODES.has(error.code));
	}

	/**
	 * Reads a file and returns the contents as an Uint8Array.
	 * @param {string|URL} filePath The path to the file to read.
	 * @returns {Promise<Uint8Array|undefined>} A promise that resolves with the contents
	 *    of the file or undefined if the file doesn't exist.
	 * @throws {Error} If the file cannot be read.
	 * @throws {TypeError} If the file path is not a string.
	 */
	bytes(filePath) {
		return this.#retrier
			.retry(() => this.#fsp.readFile(filePath))
			.then(buffer => new Uint8Array(buffer.buffer))
			.catch(error => {
				if (error.code === "ENOENT") {
					return undefined;
				}

				throw error;
			});
	}

	/**
	 * Writes a value to a file. If the value is a string, UTF-8 encoding is used.
	 * @param {string|URL} filePath The path to the file to write.
	 * @param {Uint8Array} contents The contents to write to the
	 *   file.
	 * @returns {Promise<void>} A promise that resolves when the file is
	 *  written.
	 * @throws {TypeError} If the file path is not a string.
	 * @throws {Error} If the file cannot be written.
	 */
	async write(filePath, contents) {
		const value = Buffer.from(contents);

		return this.#retrier
			.retry(() => this.#fsp.writeFile(filePath, value))
			.catch(error => {
				// the directory may not exist, so create it
				if (error.code === "ENOENT") {
					const dirPath = require$$0.dirname(
						filePath instanceof URL
							? fileURLToPath(filePath)
							: filePath,
					);

					return this.#fsp
						.mkdir(dirPath, { recursive: true })
						.then(() => this.#fsp.writeFile(filePath, value));
				}

				throw error;
			});
	}

	/**
	 * Appends a value to a file. If the value is a string, UTF-8 encoding is used.
	 * @param {string|URL} filePath The path to the file to append to.
	 * @param {Uint8Array} contents The contents to append to the
	 *  file.
	 * @returns {Promise<void>} A promise that resolves when the file is
	 * written.
	 * @throws {TypeError} If the file path is not a string.
	 * @throws {Error} If the file cannot be appended to.
	 */
	async append(filePath, contents) {
		const value = Buffer.from(contents);

		return this.#retrier
			.retry(() => this.#fsp.appendFile(filePath, value))
			.catch(error => {
				// the directory may not exist, so create it
				if (error.code === "ENOENT") {
					const dirPath = require$$0.dirname(
						filePath instanceof URL
							? fileURLToPath(filePath)
							: filePath,
					);

					return this.#fsp
						.mkdir(dirPath, { recursive: true })
						.then(() => this.#fsp.appendFile(filePath, value));
				}

				throw error;
			});
	}

	/**
	 * Checks if a file exists.
	 * @param {string|URL} filePath The path to the file to check.
	 * @returns {Promise<boolean>} A promise that resolves with true if the
	 *    file exists or false if it does not.
	 * @throws {Error} If the operation fails with a code other than ENOENT.
	 */
	isFile(filePath) {
		return this.#fsp
			.stat(filePath)
			.then(stat => stat.isFile())
			.catch(error => {
				if (error.code === "ENOENT") {
					return false;
				}

				throw error;
			});
	}

	/**
	 * Checks if a directory exists.
	 * @param {string|URL} dirPath The path to the directory to check.
	 * @returns {Promise<boolean>} A promise that resolves with true if the
	 *    directory exists or false if it does not.
	 * @throws {Error} If the operation fails with a code other than ENOENT.
	 */
	isDirectory(dirPath) {
		return this.#fsp
			.stat(dirPath)
			.then(stat => stat.isDirectory())
			.catch(error => {
				if (error.code === "ENOENT") {
					return false;
				}

				throw error;
			});
	}

	/**
	 * Creates a directory recursively.
	 * @param {string|URL} dirPath The path to the directory to create.
	 * @returns {Promise<void>} A promise that resolves when the directory is
	 *   created.
	 */
	async createDirectory(dirPath) {
		await this.#fsp.mkdir(dirPath, { recursive: true });
	}

	/**
	 * Deletes a file or empty directory.
	 * @param {string|URL} fileOrDirPath The path to the file or directory to
	 *   delete.
	 * @returns {Promise<boolean>} A promise that resolves when the file or
	 *   directory is deleted, true if the file or directory is deleted, false
	 *   if the file or directory does not exist.
	 * @throws {TypeError} If the file or directory path is not a string.
	 * @throws {Error} If the file or directory cannot be deleted.
	 */
	delete(fileOrDirPath) {
		return this.#fsp
			.rm(fileOrDirPath)
			.then(() => true)
			.catch(error => {
				if (error.code === "ERR_FS_EISDIR") {
					return this.#fsp.rmdir(fileOrDirPath).then(() => true);
				}

				if (error.code === "ENOENT") {
					return false;
				}

				throw error;
			});
	}

	/**
	 * Deletes a file or directory recursively.
	 * @param {string|URL} fileOrDirPath The path to the file or directory to
	 *   delete.
	 * @returns {Promise<boolean>} A promise that resolves when the file or
	 *   directory is deleted, true if the file or directory is deleted, false
	 *   if the file or directory does not exist.
	 * @throws {TypeError} If the file or directory path is not a string.
	 * @throws {Error} If the file or directory cannot be deleted.
	 */
	deleteAll(fileOrDirPath) {
		return this.#fsp
			.rm(fileOrDirPath, { recursive: true })
			.then(() => true)
			.catch(error => {
				if (error.code === "ENOENT") {
					return false;
				}

				throw error;
			});
	}

	/**
	 * Returns a list of directory entries for the given path.
	 * @param {string|URL} dirPath The path to the directory to read.
	 * @returns {AsyncIterable<HfsDirectoryEntry>} A promise that resolves with the
	 *   directory entries.
	 * @throws {TypeError} If the directory path is not a string.
	 * @throws {Error} If the directory cannot be read.
	 */
	async *list(dirPath) {
		const entries = await this.#fsp.readdir(dirPath, {
			withFileTypes: true,
		});

		for (const entry of entries) {
			yield new NodeHfsDirectoryEntry(entry);
		}
	}

	/**
	 * Returns the size of a file. This method handles ENOENT errors
	 * and returns undefined in that case.
	 * @param {string|URL} filePath The path to the file to read.
	 * @returns {Promise<number|undefined>} A promise that resolves with the size of the
	 *  file in bytes or undefined if the file doesn't exist.
	 */
	size(filePath) {
		return this.#fsp
			.stat(filePath)
			.then(stat => stat.size)
			.catch(error => {
				if (error.code === "ENOENT") {
					return undefined;
				}

				throw error;
			});
	}

	/**
	 * Returns the last modified date of a file or directory. This method handles ENOENT errors
	 * and returns undefined in that case.
	 * @param {string|URL} fileOrDirPath The path to the file to read.
	 * @returns {Promise<Date|undefined>} A promise that resolves with the last modified
	 * date of the file or directory, or undefined if the file doesn't exist.
	 */
	lastModified(fileOrDirPath) {
		return this.#fsp
			.stat(fileOrDirPath)
			.then(stat => stat.mtime)
			.catch(error => {
				if (error.code === "ENOENT") {
					return undefined;
				}

				throw error;
			});
	}

	/**
	 * Copies a file from one location to another.
	 * @param {string|URL} source The path to the file to copy.
	 * @param {string|URL} destination The path to copy the file to.
	 * @returns {Promise<void>} A promise that resolves when the file is copied.
	 * @throws {Error} If the source file does not exist.
	 * @throws {Error} If the source file is a directory.
	 * @throws {Error} If the destination file is a directory.
	 */
	copy(source, destination) {
		return this.#fsp.copyFile(source, destination);
	}

	/**
	 * Copies a file or directory from one location to another.
	 * @param {string|URL} source The path to the file or directory to copy.
	 * @param {string|URL} destination The path to copy the file or directory to.
	 * @returns {Promise<void>} A promise that resolves when the file or directory is
	 * copied.
	 * @throws {Error} If the source file or directory does not exist.
	 * @throws {Error} If the destination file or directory is a directory.
	 */
	async copyAll(source, destination) {
		// for files use copy() and exit
		if (await this.isFile(source)) {
			return this.copy(source, destination);
		}

		const sourceStr =
			source instanceof URL ? fileURLToPath(source) : source;

		const destinationStr =
			destination instanceof URL
				? fileURLToPath(destination)
				: destination;

		// for directories, create the destination directory and copy each entry
		await this.createDirectory(destination);

		for await (const entry of this.list(source)) {
			const fromEntryPath = require$$0.join(sourceStr, entry.name);
			const toEntryPath = require$$0.join(destinationStr, entry.name);

			if (entry.isDirectory) {
				await this.copyAll(fromEntryPath, toEntryPath);
			} else {
				await this.copy(fromEntryPath, toEntryPath);
			}
		}
	}

	/**
	 * Moves a file from the source path to the destination path.
	 * @param {string|URL} source The location of the file to move.
	 * @param {string|URL} destination The destination of the file to move.
	 * @returns {Promise<void>} A promise that resolves when the move is complete.
	 * @throws {TypeError} If the file paths are not strings.
	 * @throws {Error} If the file cannot be moved.
	 */
	move(source, destination) {
		return this.#fsp.stat(source).then(stat => {
			if (stat.isDirectory()) {
				throw new Error(
					`EISDIR: illegal operation on a directory, move '${source}' -> '${destination}'`,
				);
			}

			return this.#fsp.rename(source, destination);
		});
	}

	/**
	 * Moves a file or directory from the source path to the destination path.
	 * @param {string|URL} source The location of the file or directory to move.
	 * @param {string|URL} destination The destination of the file or directory to move.
	 * @returns {Promise<void>} A promise that resolves when the move is complete.
	 * @throws {TypeError} If the file paths are not strings.
	 * @throws {Error} If the file or directory cannot be moved.
	 */
	async moveAll(source, destination) {
		return this.#fsp.rename(source, destination);
	}
}

/**
 * A class representing a file system utility library.
 * @implements {HfsImpl}
 */
class NodeHfs extends Hfs {
	/**
	 * Creates a new instance.
	 * @param {object} [options] The options for the instance.
	 * @param {Fsp} [options.fsp] The file system module to use.
	 */
	constructor({ fsp } = {}) {
		super({ impl: new NodeHfsImpl({ fsp }) });
	}
}

const hfs = new NodeHfs();

export { Hfs, NodeHfs, NodeHfsImpl, hfs };
