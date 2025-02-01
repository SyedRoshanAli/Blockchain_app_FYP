const CreatePost = artifacts.require("CreatePost");

module.exports = function (deployer) {
  deployer.deploy(CreatePost);
};
