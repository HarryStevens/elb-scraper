const scrape = require("jquery-scrape"),
      _ = require("underscore"),
      fs = require("fs"),
      path = require("path"),
      jsdom = require("jsdom"),
      d3 = require("d3-selection"),
      makeDom = require("./make-dom"),
      nodemailer = require("nodemailer");

require("./utils/rateLimit");

// Get the RSS feed
scrape("http://electionlawblog.org/?feed=rss2", $ => {
  const lastBuildDate = new Date($("lastBuildDate").html());
  const json = [];
  const items = $("item");

  // Convert all items to JSON
  items.each((itemIndex, item) => {
    const obj = {
      title: extractText("title"),
      link: extractText("guid"),
      pubDate: new Date(extractText("pubDate"))
    }

    if (datesEqual(obj.pubDate, lastBuildDate)) {
      json.push(obj);
    }

    function extractText(el){
      return $(item).find(el).text().trim();
    }
  });

  const visitPageLimited = _.rateLimit(visitPage, 1000);
  let visitCount = 0;

  console.log(`Found ${json.length} items`);

  // Loop through the JSON to fill out
  // each item's content
  json.forEach(visitPageLimited);

  function visitPage(obj, index){
    scrape(obj.link, $ => {

      // Fill in the rest of each item's information
      obj.pubTime = $(".meta-info-wrap").find("time").text().trim();
      obj.author = $(".meta-info-wrap").find(".author.vcard").text().trim();
      obj.content = $(".entry-content.cf").html();

      visitCount++;
      process.stdout.write(`\rRetrieved item ${visitCount}`);

      // Once we've scraped all items, we'll send an email
      if (visitCount === json.length){
        console.log(`\nRetrieved ${visitCount} items`);
        console.log("Creating DOM");
        const { html, text, } = makeDom(json);

        // Create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.SENDER_NAME,
            pass: process.env.SENDER_SECRET
          }
        });

        // Send mail with defined transport object
        transporter.sendMail({
          from: `"Mr. Newsletter" <${process.env.SENDER_NAME}>`, // sender address
          to: `${process.env.RECIPIENT_NAME}`, // list of receivers
          subject: `ELB ${json[0].pubTime.split(" ").filter((d, i) => i < 3).join(" ")}`, // Subject line
          text,
          html,
        }, (error, info) => {
          if (error) {
            console.log("Error: ", error);
            return;
          }

          console.log("Message sent: %s", info.messageId);
        });

      }
    });
  }

});

function datesEqual(dateA, dateB){
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
}