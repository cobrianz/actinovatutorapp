import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    const commentsCollection = db.collection('comments');
    const postsCollection = db.collection('posts');
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: 'Comment content is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify post exists
    const post = await postsCollection.findOne({ _id: new ObjectId(params.id), status: 'published' });
    if (!post) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create new comment
    const newComment = {
      postId: new ObjectId(params.id),
      content: content.trim(),
      createdBy: 'Anonymous', // Replace with actual user ID from auth system
      createdAt: new Date(),
      likes: 0
    };

    const result = await commentsCollection.insertOne(newComment);

    // Update post comment count
    await postsCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { $inc: { comments: 1 } }
    );

    return new Response(JSON.stringify({
      id: result.insertedId.toString(),
      author: newComment.createdBy,
      content: newComment.content,
      timeAgo: newComment.createdAt.toLocaleString(),
      likes: newComment.likes
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    return new Response(JSON.stringify({ error: 'Failed to post comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}