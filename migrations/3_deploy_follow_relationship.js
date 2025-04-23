const FollowRelationship = artifacts.require("FollowRelationship");

module.exports = function(deployer) {
  deployer.deploy(FollowRelationship);
}; 