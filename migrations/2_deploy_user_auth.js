const UserAuth = artifacts.require("UserAuth");

module.exports = function (deployer) {
  deployer.deploy(UserAuth, { gas: 6721975 });
};
