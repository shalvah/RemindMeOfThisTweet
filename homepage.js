
const {http} = require("./src/utils");

module.exports.getHomePage = async (event, context) => {
    return http.renderHtml('home');
};
