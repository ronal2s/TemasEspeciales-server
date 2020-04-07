const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const Axios = require("axios")
const { 
  restaurantsSantiagoData,
  santiagoRestaurants,
} = require("./data/restaurantsRD");
var nodeoutlook = require('nodejs-nodemailer-outlook')

const { routesArrayRD } = require("./routesRD");
let miCache = {}

function sendMail(body, callback) {
  nodeoutlook.sendEmail({
      auth: {
          user: "ronal2w@outlook.com",
          pass: "xxxx"
      },
      from: 'ronal2w@outlook.com',
      to: 'ronal2w@gmail.com',
      subject: `[QueComer]`,
      text: body,
      attachments: [],
      onError: (e) => {
          console.log(e)
          callback({ error: true })
      },
      onSuccess: (i) => {
          console.log(i)
          callback({ error: false })
      }
  }
  );
}

app.get("/contacto", (req, res) => {
  let { body } = req.query;
  console.log(req.query);
  sendMail(body, (result) => {
      res.send(result)
  })
})

app.get("/wakeup", (req, res) => {
  miCache = {}
  res.send("ok")
})

app.get("/rd/santiagotitles", (req, res) => {
  res.send(santiagoRestaurants)

})

app.get("/rd/santiagoRestaurantsInfo", (req, res) => {
  res.send(restaurantsSantiagoData);
})

async function instagramPhotos(url, cantPhotos) {
  // It will contain our photos' links

  console.time("[START]")
  if (miCache[url]) {
    console.timeEnd("[START]")
    return miCache[url]
  }
  const data = []
  //no manda na'
  try {
    const userInfoSource = await Axios.get(url)
    // console.log(userInfoSource)
    // userInfoSource.data contains the HTML from Axios
    const jsonObject = userInfoSource.data.match(/<script type="text\/javascript">window\._sharedData = (.*)<\/script>/)[1].slice(0, -1)

    const userInfo = JSON.parse(jsonObject)
    // Retrieve only the first 10 results
    const mediaArray = userInfo.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges.splice(0, cantPhotos)
    for (let media of mediaArray) {
      const node = media.node

      // Process only if is an image
      if ((node.__typename && node.__typename !== 'GraphImage')) {
        continue
      }
       //return node;

      // Push the thumbnail src in the array
      urlParts = node.thumbnail_src.split("%")
      //console.log(urlParts[0])
      if (node.accessibility_caption.includes("food")) {
        data.push({
          img: urlParts[0],
          text: node.edge_media_to_caption.edges[0].node.text,
          likes: node.edge_liked_by.count,
          accessibility: node.accessibility_caption
        })
      }
      //console.log(res)
    }
  } catch (e) {
    console.error('Unable to retrieve photos. Reason: ' + e.toString())
  }

  console.timeEnd("[START]")

  miCache[url] = data;
  return data
}//end

for (const route of routesArrayRD) {
  app.get(route.route, async (req, res) => {
    try {
      const data = await instagramPhotos(route.instagramUrl, 10)
      return res.send({ data: data })
      // return res.send(data)
    } catch (err) {
      console.log(err)
      return res.send({ error: err.message })
    }
  })
}



app.listen(port, () => console.log("Listen on port" + port));
