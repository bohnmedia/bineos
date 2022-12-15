Bineos.prototype.placementFunctions = {
  // Custom function shuffle
  shuffle: (placement) => {
    placement.data.productLoop.sort((a, b) => Math.random() - 0.5);
  },

  // Custom function limit
  limit: (placement, limit) => {
    placement.data.productLoop.splice(limit);
  },
};
