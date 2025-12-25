import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const postsCollection = db.collection('posts');

    // Fetch all posts with status 'published'
    const posts = await postsCollection.find({ status: 'published' }).toArray();

    // Transform posts to match frontend expected format
    const formattedPosts = posts.map(post => ({
      id: post._id.toString(),
      title: post.title,
      excerpt: post.description,
      author: post.createdBy ? post.createdBy.toString() : 'Unknown Author', // Adjust based on your user data
      date: post.publishDate,
      readTime: post.readTime,
      category: post.category,
      image: post.featuredImage || '/placeholder.svg',
      tags: post.keywords ? post.keywords.split(',').map(k => k.trim()) : [],
      featured: post.featured === 'true',
      trending: false // Add logic if you have a trending indicator in your schema
    }));

    // Generate categories dynamically
    const categories = [
      { name: 'All', value: 'all', count: formattedPosts.length },
      ...[...new Set(formattedPosts.map(post => post.category))]
        .map(category => ({
          name: category,
          value: category.toLowerCase().replace(/\s+/g, '-'),
          count: formattedPosts.filter(post => post.category === category).length
        }))
    ];

    return new Response(JSON.stringify({ posts: formattedPosts, categories }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}