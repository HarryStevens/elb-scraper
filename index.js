const scrape = require("jquery-scrape"),
      _ = require("underscore"),
      fs = require("fs"),
      path = require("path"),
      jsdom = require("jsdom"),
      d3 = require("d3-selection"),
      makeDom = require("./make-dom"),
      nodemailer = require("nodemailer");

require("./utils/rateLimit");

scrape("http://electionlawblog.org/?feed=rss2", $ => {
  const lastBuildDate = new Date($("lastBuildDate").html());
  const filename = makeFilename(lastBuildDate);
  const json = [];
  const items = $("item");
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
    function extractHtml(el){
      return $(item).find(el).html();
    }
  });

  const visitPageLimited = _.rateLimit(visitPage, 1000);
  let visitCount = 0;

  console.log(`Found ${json.length} items`);

  json.forEach(visitPageLimited);

  function visitPage(obj, index){
    scrape(obj.link, $ => {
      obj.pubTime = $(".meta-info-wrap").find("time").text().trim();
      obj.author = $(".meta-info-wrap").find(".author.vcard").text().trim();
      obj.content = $(".entry-content.cf").html();

      visitCount++;
      process.stdout.write(`\rRetrieved item ${visitCount}`);
      if (visitCount === json.length){
        console.log(`\nRetrieved ${visitCount} items`);
        console.log("Writing backup file " + filename);
        fs.writeFileSync(path.normalize(__dirname + filename), JSON.stringify(json));
        console.log("Creating DOM");
        const { html, text, } = makeDom(json);

        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.SENDER_NAME,
            pass: process.env.SENDER_SECRET
          }
        });

        // send mail with defined transport object
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
function makeFilename(d){
  return `/data/elb-${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}.json`;
}
function padTwo(n){
  const s = n.toString();
  return s.length === 1 ? "0" + s : s;
}