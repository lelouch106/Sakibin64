const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "videoDownloader",
  version: "1.0.0",
  hasPermission: 0,
  credits: "Sakibin",
  description: "Automatically downloads videos from TikTok, Facebook, and Instagram when a link is provided.",
  commandCategory: "utility",
  usages: "Send a TikTok, Facebook, or Instagram video link to download.",
  cooldowns: 3,
};

async function downloadVideo(videoUrl, threadID, messageID, api) {
  try {
    // Set a "downloading" reaction
    await api.setMessageReaction("🔄", messageID, (err) => {}, true);

    const response = await axios.get(`https://gpt-19zs.onrender.com/alldl?url=${encodeURIComponent(videoUrl)}`);
    if (response.data.status) {
      const videoData = response.data.data;
      const videoTitle = videoData.title;
      const videoDownloadUrl = videoData.low;

      const videoPath = path.resolve(__dirname, 'cache', `${videoTitle}.mp4`);
      const videoStream = fs.createWriteStream(videoPath);

      const videoResponse = await axios({
        url: videoDownloadUrl,
        method: 'GET',
        responseType: 'stream',
      });

      videoResponse.data.pipe(videoStream);

      videoStream.on('finish', async () => {
        // Set a "done" reaction
        await api.setMessageReaction("✅", messageID, (err) => {}, true);

        api.sendMessage({
          body: `Here is your downloaded video: ${videoTitle}`,
          attachment: fs.createReadStream(videoPath),
        }, threadID, () => {
          fs.unlinkSync(videoPath); // Delete video file after sending
        });
      });
    } else {
      await api.setMessageReaction("❌", messageID, (err) => {}, true);
      api.sendMessage("Unable to download the video. Please ensure the link is correct.", threadID);
    }
  } catch (error) {
    console.error(error);
    await api.setMessageReaction("❌", messageID, (err) => {}, true);
    api.sendMessage("Error: Failed to download the video.", threadID);
  }
}

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, body } = event;

  // Check if the message contains a TikTok, Facebook, or Instagram link
  const regex = /(https?:\/\/(?:[a-zA-Z0-9-]+\.)?(tiktok\.com|facebook\.com|instagram\.com)\/[^\s]+)/gi;

  const match = body.match(regex);

  if (match) {
    const videoUrl = match[0]; // Take the first matched URL
    await downloadVideo(videoUrl, threadID, messageID, api);
  }
};

module.exports.run = async function ({ api, event }) {};