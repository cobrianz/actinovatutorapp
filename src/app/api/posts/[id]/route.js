import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    const postsCollection = db.collection('posts');
    const commentsCollection = db.collection('comments'); // Assuming a comments collection

    // Fetch the post by ID
    const post = await postsCollection.findOne({ _id: new ObjectId(params.id), status: 'published' });

    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch comments for the post
    const comments = await commentsCollection
      .find({ postId: new ObjectId(params.id) })
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch related posts (based on category, excluding current post)
    const relatedPosts = await postsCollection
      .find({
        category: post.category,
        _id: { $ne: new ObjectId(params.id) },
        status: 'published'
      })
      .limit(3)
      .toArray();

    // Format post data
    const formattedPost = {
      id: post._id.toString(),
      title: post.title,
      content: post.content,
      author: post.createdBy ? post.createdBy.toString() : 'Unknown Author', // Adjust based on your user data
      authorAvatar: '/placeholder.svg', // Since avatars were replaced with User icon
      authorBio: 'Author bio not available', // Add logic to fetch from users collection if needed
      date: post.publishDate,
      readTime: post.readTime,
      category: post.category,
      image: post.featuredImage || '/placeholder.svg',
      tags: post.keywords ? post.keywords.split(',').map(k => k.trim()) : [],
      views: post.views || 0,
      likes: post.likes || 0,
      featured: post.featured === 'true'
    };

    // Format comments
    const formattedComments = comments.map(comment => ({
      id: comment._id.toString(),
      author: comment.createdBy ? comment.createdBy.toString() : 'Anonymous',
      avatar: '/placeholder.svg', // Since avatars were replaced with User icon
      content: comment.content,
      timeAgo: new Date(comment.createdAt).toLocaleString(), // Adjust time format as needed
      likes: comment.likes || 0
    }));

    // Format related posts
    const formattedRelatedPosts = relatedPosts.map(relatedPost => ({
      id: relatedPost._id.toString(),
      title: relatedPost.title,
      image: relatedPost.featuredImage || '/placeholder.svg',
      readTime: relatedPost.readTime,
      category: relatedPost.category
    }));

    return new Response(JSON.stringify({
      post: formattedPost,
      comments: formattedComments,
      relatedPosts: formattedRelatedPosts
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch post' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}