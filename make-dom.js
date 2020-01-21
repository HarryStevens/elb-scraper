const d3 = require("d3-selection"),
      jsdom = require("jsdom"),
      fs = require("fs"),
      path = require("path");

// Test it
const {html} = makeDom(JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/elb-2020-01-21.json"), "utf8")))
fs.writeFileSync(path.normalize(__dirname + "/html/index.html"), html);

function makeDom(json){
  const { JSDOM } = jsdom;
  const dom = new JSDOM(`<!DOCTYPE html>`);
  const doc = d3.select(dom.window.document);
  const body = doc.select("body");

  const css = fs.readFileSync(path.normalize(__dirname + "/css/styles.css"), "utf8");

  body.append("style").html(css);

  const nlHtml = body.append("div")
      .attr("class", "nl-html");

  const nlBody = nlHtml.append("div")
      .attr("class", "nl-body");

  nlBody.append("h1")
      .attr("class", "nl-title")
      .text("Election Law Blog");

  json.reverse();

  nlBody.append("div")
      .attr("class", "nl-date")
      .text(json[0].pubTime.split(" ").filter((d, i) => i < 3).join(" "));

  const item = nlBody.selectAll(".item")
      .data(json)
    .enter().append("div")
      .attr("class", "item");

  item.append("h3")
      .attr("class", "item-title")
      .text((d, i) => `${i + 1}. ${d.title}`);

  item.append("div")
      .attr("class", "item-meta")
      .html(d => `By <b>${d.author.toUpperCase()}</b> at ${d.pubTime.split(" ").filter((f, i) => i > 2).join(" ")}`);

  item.append("div")
      .attr("class", "item-content")
      .html(d => d.content.split("<div class=\"addtoany_share_save_container")[0]);

  item.append("div")
      .attr("class", "item-link")
      .html(d => `Permalink: <a href="${d.link}">${d.link}</a>`);

  item.append("hr")
      .style("display", (d, i, e) => i === e.length - 1 ? "none" : "block");

  return {html: `<!DOCTYPE html><html>${parseBody(doc.select("html").html())}</html>`, text: parseBody(doc.select("body").text())};
}

function parseBody(input){
  return replaceAll(replaceAll(replaceAll(replaceAll(replaceAll(replaceAll(replaceAll(input, "“", "&ldquo;"), "”", "&rdquo;"), "’", "&rsquo;"), "⏤", "&mdash;"), "—", "&ndash;"), "…", "..."), "  ", " ")
}
function replaceAll(x, y, z){
  return x.toString().replace(new RegExp(y, "g"), z);
}

module.exports = makeDom;