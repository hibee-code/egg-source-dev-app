const Poultry = require("../models/poultry.model");

class PoultryRepository {
  async create(data) {
    return Poultry.create(data);
  }

  async findById(id) {
    return Poultry.findById(id);
  }

  async findOne(filter) {
    return Poultry.findOne(filter);
  }

  async findAll(filter = {}) {
    return Poultry.find(filter);
  }

  async update(id, updateData) {
    return Poultry.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return Poultry.findByIdAndDelete(id);
  }

  async aggregate(pipeline) {
    return Poultry.aggregate(pipeline);
  }
}

module.exports = new PoultryRepository();
