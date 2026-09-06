const http = require('node:http');
const { EventEmitter } = require('node:events');
const { Readable, Writable } = require('node:stream');

// Import server logic by wrapping server.js or refactoring server.js to export handler
// Let's inspect how server.js is structured
const fs = require('node:fs');
const path = require('node:path');

// Let's create an in-process mock HTTP tester
class MockRequest extends Readable {
  constructor(method, url, headers = {}, body = null) {
    super();
    this.method = method;
    this.url = url;
    this.headers = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    );
    this._body = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    if (this._body) {
      this.headers['content-length'] = Buffer.byteLength(this._body);
      this.push(this._body);
    }
    this.push(null);
  }
  _read() {}
}

class MockResponse extends EventEmitter {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.bodyChunks = [];
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    Object.assign(this.headers, headers);
    return this;
  }

  setHeader(k, v) {
    this.headers[k.toLowerCase()] = v;
  }

  write(chunk) {
    if (chunk) this.bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  end(chunk) {
    if (chunk) this.bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    this.emit('finish');
  }

  getBodyText() {
    return Buffer.concat(this.bodyChunks).toString('utf8');
  }

  getBodyJson() {
    try {
      return JSON.parse(this.getBodyText());
    } catch {
      return null;
    }
  }
}

module.exports = { MockRequest, MockResponse };
