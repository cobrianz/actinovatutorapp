import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    const postsCollection = db.collection('posts');
    const { like } = await request.json();

    // Update like count
    const update = like
      ? { $inc: { likes: 1 } }
      : { $inc: { likes: -1 } };

    const result = await postsCollection.updateOne(
      { _id: new ObjectId(params.id), status: 'published' },
      update
    );

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating like:', error);
    return new Response(JSON.stringify({ error: 'Failed to update like' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};