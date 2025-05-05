const admin = require('firebase-admin');
const axios = require('axios');

// YouTube API Keys Rotation
const YOUTUBE_API_KEYS = [
  'AIzaSyARtyC6riNolI0cayoId61SUNSO-VuUSoU',
  'AIzaSyAre88KKhL_izC0nJjbWSakvmIOPSleGhs',
  'AIzaSyCk4XNcGoqSSAZMCNmar6B2bFUMfN0lxok',
  'AIzaSyAKuYPfahrDzfAZFv5WOOv1FRIle8aSwiQ',
  'AIzaSyAU7UQiJ__3hojf28zdYDZpDtDwyLxhJGo'
];
let currentKeyIndex = 0;
let requestCount = 0;
const MAX_REQUESTS_PER_KEY = 88;

// YouTube Channels
const CHANNELS = [
'UCq0ybF3esnwdrGXsLCd0f8w', // Lior Explainer
'UC7ncFNU-4Pjn350beuM-gCg', // Suliman
'UCs9JaFV3d2LVtRR9zMtdhNQ', // The Move Sky
'UC75E7hN2RwBqxGgArBKgiKA', // اوسكار العراق 
'UCoS14Se14uOJPArUbQPLhFQ', // EditDE7
'UCRnXj2LxvDBv8ErtFvTKTRA', // Rendi goodboy
'UCnNmn4vRSbuZ_X2vjjtDOMQ', // Qcriple
'UCZR2b4occmB3Qtlkjee8ytg', // MijEditz
'UClaiPI7ouBRPhkarxO7DV9w', // Oleg Pars
'UCcqIANwDbdjHQWlN3tl1T2A', // ZYCBBM 
'UCsY4tPKd0mcHScevYyP1w2A', // SciMythical007 
'UC3xgevNpGmAgWpdjtTXR20w', // Wian 
'UCerlWKdEoZ9wOQf2WUWi9Rg', // X2 
'UCVo-g8QCIKdXmX7rcT_aiVw', // Saurov Official
'UCac6m8K3OGHUT4itHwpCAmw', //  Lost in Time
'UCTjnJL1MXV7Q4YVA3t7pFVg', // Wissada
'UCdMNbinLblfrN-Hm_HzXUiQ', // جيون Mina 
'UCkLNHZZsC3LKdUAroKNwOOw', // CuRe
'UCFBYRGJpJ2FG7Oh-JpCOZkQ', // Puppies Love 
'UCxDrxkFEcYviLEJ2C5u_kbQ', // JasminandJames
'UCIi133AJfzVdiAJe80MLbDQ', // Asel Mustafa
'UClFSUSP4WjDHnEqxNf4C43Q', // Tropical insectsa
'UCsx78_SK9xUzNcjJpLTbTzw', // movlogs
'UC96nWfYyNUfvUklBJtIplRA', // محبين لانا ولين
'UCzpucOwW8PQXQ_VU34H7kuA', // Narins Beauty Family
'UCqq5n-Oe-r1EEHI3yvhVJcA', // AboFlah
'UCQB9yZWLvcSNI9ruw74iF8Q', // Ahmad Aburob
'UCPokJ1HtDczTd0rRPMwMeWw', // Omar aburobb
'UCjqme9B0yXqIC1PZkFFUBfw', // MarceloComCelo
'UC497tVZykgrFrJvDXdI_-SA', // Jin and Hattie
'UCwHE1kM1CPJd_pI9FQ0-4dg', // shfa
'UCAHfrKOebWz6_23eKKm9vqw', // Misaha
'UCV2JkEBmtfSYGAIlprAhAyQ', // Arab Games Network 
'UCrw49J13uH1oElsUC3q_1pw', // N
'UC-v_CmOijyT8QVWq9H_1qfg', // AuraForge
'UCZE_XnY_UazcRILVru7znDw', // Khalid Al Ameri
'UChOPyo-uWLVi5uO53mSBX-w', // Noor Stars 
'UCwBGFE-r7YeFFHT7JmxWPgg', // Ossy Marwah 
'UCWKF7jRIPLVBcnE2p993yAg', // Bessan Ismail
'UCdcZhYtGKo8n1VRLgxMe_hA', // Kika Kim
'UCYJHVw7OYgtwiNks92eag5Q', // simba17 official
'UCFGZTrhn2GbEsgQ8-12-rIA', // Ghaith Marwan
'UCoWHUkZf4bATsTlnqcNVPfw', // Bjlife
'UCxEGVXh6fi-XYo58NZrbIHQ', // BanderitaX
'UC9Z-zmiY4J3KGe_aNPATSeA', // Basma if
'UCXnKd1R2a7ebk6hvIzS57WA', // Osama
'UCVEvXfblll0OjxBE_I9YeOw',  // Karadenizli Maceracı
'UCTO40euu-crofOMmL3SULqg', // CHICKEN BALALM
'UC0fvGpDXi7sV2hbgD-O47yw', // Amaury Guichon
'UC7Vr_TnuV66BKKHQ5qOsUKA', // Yasser Ahmed
'UCXxjVrHdBLJV0EhOczWTw0g', // Low Budget Ball
'UC7108gLyg2hCacGQtH3UqZQ', // Stillworse
'UCm_K3dRBOVt3rHLtPsjVSjA', // Marc Ruiz
'UCrw49J13uH1oElsUC3q_1pw', // N
'UChHje2tB0q8m-kCaNdJVDmA', // Hdit W Kora
'UCkwICkGluKZ8ZJVVQFQ-pdQ', // abdel abdou
'UCjDeNOJxVmNTlP2AfAfPzbw', // 	Ali ball
'UCvQ0oz1NhZZU7-LC8z7KGuA', // Dm football
'UC2bW_AY9BlbYLGJSXAbjS4Q', // Live Speedy
'UCU8bQExxd38i-mnn-GLOtfA' // UFC Eurasia
];

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Main function to fetch videos
async function fetchVideos() {
  try {
    const now = new Date();
    const moroccoTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
    const currentHour = moroccoTime.getHours();

    const todayStart = new Date(moroccoTime);
    todayStart.setHours(0, 0, 0, 0);
    const videosToday = await db.collection('videos')
      .where('timestamp', '>=', todayStart)
      .count()
      .get();

    if (videosToday.data().count >= 440) {
      console.log('🎯 Daily target (440 videos) already reached');
      return;
    }

    if (currentHour === 19) {
      console.log('⏸️ System resting (7-8PM Morocco time)');
      return;
    }

    for (const channelId of CHANNELS) {
      const currentApiKey = YOUTUBE_API_KEYS[currentKeyIndex];
      let video = await fetchLatestVideo(channelId, currentApiKey);

      if (!video) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        video = await fetchOldestVideo(channelId, currentApiKey, oneYearAgo.toISOString());
      }

      if (video) {
        await db.collection('videos').doc(video.videoId).set({
          ...video,
          isAI: true,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Added video ${video.videoId} from channel ${channelId}`);
        requestCount++;
        if (requestCount >= MAX_REQUESTS_PER_KEY) {
          requestCount = 0;
          currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
          console.log(`🔄 Rotating to YouTube API key ${currentKeyIndex + 1}`);
        }
      } else {
        console.log(`⚠️ No suitable video found for channel ${channelId}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
    requestCount = 0;
  }
}

// Fetch latest video
async function fetchLatestVideo(channelId, apiKey) {
  const response = await axios.get(
    `https://www.googleapis.com/youtube/v3/search?key=${apiKey}` +
    `&channelId=${channelId}` +
    `&part=snippet,id` +
    `&order=date` +
    `&maxResults=1` +
    `&type=video` +
    `&videoDuration=short`
  );

  if (response.data.items.length === 0) return null;
  return await processVideoData(response.data.items[0].id.videoId, apiKey);
}

// Fetch oldest short video from past year
async function fetchOldestVideo(channelId, apiKey, publishedAfter) {
  const response = await axios.get(
    `https://www.googleapis.com/youtube/v3/search?key=${apiKey}` +
    `&channelId=${channelId}` +
    `&part=snippet,id` +
    `&order=date` +
    `&maxResults=10` +
    `&publishedAfter=${publishedAfter}` +
    `&type=video` +
    `&videoDuration=short`
  );

  for (const item of response.data.items) {
    const video = await processVideoData(item.id.videoId, apiKey);
    if (video) return video;
  }

  return null;
}

// Process full video data with likes, comments, avatar, verified badge
async function processVideoData(videoId, apiKey) {
  const detailsResponse = await axios.get(
    `https://www.googleapis.com/youtube/v3/videos?key=${apiKey}` +
    `&id=${videoId}` +
    `&part=snippet,contentDetails,statistics`
  );

  const videoData = detailsResponse.data.items[0];
  if (!videoData) return null;

  const duration = parseDuration(videoData.contentDetails.duration);
  if (duration > 180) return null; // Skip videos longer than 3 minutes

  const channelId = videoData.snippet.channelId;
  const channelInfo = await fetchChannelInfo(channelId, apiKey);

  return {
    videoId,
    title: videoData.snippet.title,
    thumbnail: videoData.snippet.thumbnails.high.url,
    duration: videoData.contentDetails.duration,
    creatorUsername: channelInfo.title,
    creatorAvatar: channelInfo.avatar,
    isVerified: channelInfo.isVerified, // New field for verified badge
    caption: videoData.snippet.title,
    likes: parseInt(videoData.statistics?.likeCount || 0),
    comments: parseInt(videoData.statistics?.commentCount || 0),
    shares: 0
  };
}

// Get channel title, avatar, and verified badge
async function fetchChannelInfo(channelId, apiKey) {
  const res = await axios.get(
    `https://www.googleapis.com/youtube/v3/channels?key=${apiKey}` +
    `&id=${channelId}` +
    `&part=snippet,statistics,status`
  );

  const data = res.data.items[0];
  return {
    title: data.snippet.title,
    avatar: data.snippet.thumbnails.high.url,
    isVerified: data.status?.longUploadsStatus === "eligible" || false
  };
}

// Parse ISO 8601 duration
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return (parseInt(match?.[1] || 0) * 3600) +
         (parseInt(match?.[2] || 0) * 60) +
         (parseInt(match?.[3] || 0));
}

// Run the script
fetchVideos();
