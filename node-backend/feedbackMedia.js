const mongoose = require('mongoose');
const { createReadStream } = require('node:fs');
const { unlink } = require('node:fs/promises');
const { pipeline } = require('node:stream/promises');

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'feedback_media' });
}

async function store(file) {
  const stream = bucket().openUploadStream(file.filename, { metadata: { contentType: file.mimetype } });
  try {
    await pipeline(createReadStream(file.path), stream);
  } catch (error) {
    await stream.abort().catch(() => {});
    throw error;
  }
}

async function remove(filename) {
  const storage = bucket();
  const file = await storage.find({ filename }).next();
  if (file) await storage.delete(file._id);
}

async function discardTemporary(file) {
  if (file) await unlink(file.path).catch(error => {
    if (error.code !== 'ENOENT') console.error('Temporary attachment cleanup failed:', error.code);
  });
}

async function serve(req, res, next) {
  if (!/^[\w.-]+$/.test(req.params.filename)) return next();
  try {
    const storage = bucket();
    const file = await storage.find({ filename: req.params.filename }).next();
    if (!file) return next(); // Older files can still be available on disk.

    let start = 0;
    let end = file.length;
    const range = req.get('range');
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match && (match[1] || match[2])) {
        start = match[1] ? Number(match[1]) : Math.max(0, end - Number(match[2]));
        if (match[1] && match[2]) end = Math.min(end, Number(match[2]) + 1);
        if (start < end) res.status(206).set('Content-Range', `bytes ${start}-${end - 1}/${file.length}`);
      }
      if (res.statusCode !== 206) return res.status(416).set('Content-Range', `bytes */${file.length}`).end();
    }
    res.set({
      'Content-Type': file.metadata.contentType,
      'Content-Length': String(end - start),
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD' || end === start) return res.end();
    await pipeline(storage.openDownloadStream(file._id, { start, end }), res);
  } catch (error) {
    if (!res.destroyed) next(error);
  }
}

module.exports = { store, remove, discardTemporary, serve };
