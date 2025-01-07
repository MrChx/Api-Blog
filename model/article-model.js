const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const articleSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    required: true
  },
  coverImage: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = model('Article', articleSchema);