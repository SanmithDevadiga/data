import mongoose from "mongoose";
import Card from "../models/Card.js";

class CardRepository {

  async createCard(data) {
    const card = await Card.create(data);
    return card;
  }

  async addSubCard(parentId, childId) {

    return await Card.findByIdAndUpdate(
      parentId,
      { $push: { subCards: childId } },
      { returnDocument: "after" }
    );
  }

  async getCards(page, limit) {
    const skip = (page - 1) * limit;

    return await Card.find({ parentCard: null })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async getCardById(id) {
    return await Card.findById(id);
  }

  async getChildCards(cardId, page, limit) {
    const skip = (page - 1) * limit;

    // Convert to ObjectId for aggregation
    const objectId = new mongoose.Types.ObjectId(cardId);

    const result = await Card.aggregate([
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: "cards",
          localField: "subCards",
          foreignField: "_id",
          as: "children",
        },
      },
      {
        $project: {
          children: { $slice: ["$children", skip, limit] },
          totalChildren: { $size: "$children" },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return { children: [], totalChildren: 0, page, limit };
    }

    return {
      children: result[0].children,
      totalChildren: result[0].totalChildren,
      page,
      limit,
    };
  }

  async updateCard(id, data) {
    return await Card.findByIdAndUpdate(id, data, { returnDocument: "after" });
  }

  async deleteCard(id) {
    const card = await Card.findById(id);

    if (card?.parentCard) {
      await Card.findByIdAndUpdate(card.parentCard, {
        $pull: { subCards: card._id },
      });
    }

    return await Card.findByIdAndDelete(id);
  }
}

export default new CardRepository();