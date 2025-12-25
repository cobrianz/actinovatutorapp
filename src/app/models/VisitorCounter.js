import mongoose from "mongoose";

const visitorCounterSchema = new mongoose.Schema(
  {
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to increment the counter
visitorCounterSchema.statics.incrementCounter = async function () {
  try {
    // Find the counter document (assuming there's only one)
    let counter = await this.findOne();

    if (!counter) {
      // Create the counter if it doesn't exist
      counter = new this({ count: 1 });
    } else {
      // Increment the count
      counter.count += 1;
      counter.lastUpdated = new Date();
    }

    await counter.save();
    return counter;
  } catch (error) {
    console.error("Error incrementing visitor counter:", error);
    throw error;
  }
};

// Static method to get the current count
visitorCounterSchema.statics.getCurrentCount = async function () {
  try {
    const counter = await this.findOne();
    return counter ? counter.count : 0;
  } catch (error) {
    console.error("Error getting visitor count:", error);
    throw error;
  }
};

export default mongoose.models.VisitorCounter ||
  mongoose.model("VisitorCounter", visitorCounterSchema);
