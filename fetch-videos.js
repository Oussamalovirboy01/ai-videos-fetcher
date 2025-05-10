const admin = require('firebase-admin');
const axios = require('axios');
const { format } = require('date-fns');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_DAILY_VIDEOS = 40;
const TARGET_HOUR = 21;
const REQUEST_DELAY = 1500;

const CHANNELS = [
'UCWsDFcIhY2DBi3GB5uykGXA', // IShowSpeed
'UCLiTe0aOHShx7hXGyqZ9UIw', // Nat Geo Abu Dhabi
'UCPrTN8ANZigvYAshg9r3r2A', // JATMIKO HADI NEGORO
'UCkTsgrwFzlArIMAV2IuwGrw', // Knizr
'UC1vg77s-ci5Dsqcik83yphQ', // c7epic
'UC14UlmYlSNiQCBe9Eookf_A', // FC Barcelona
'UC78zEsPqqt933phfYcvPZ_A', // JETCAR
'UC5y5eBpVuIaRp5x6NJUEUdQ', // MonDejour
'UCVVD1fGNHFnFWKYSFnWrsWg', // Snap Maromba
'UCm5gUTCoXo_M_I8yWaPboug', // ItzUv
'UCG5qGWdu8nIRZqJ_GgDwQ',   // Premier League
'UCyGa1YEx9ST66rYrJTGIKOw', // UEFA
'UCG2RHsq6QejkzIluPfyZ8dg', // Miyinnia
'UCo9RMALE8ELFhnHnDg7eA_w', // BO BROWN
'UC5Y1pPVNm-odhiubuRO1D6A', // Jeremy Lynch
'UCKgDT4CiNEKlW3O2GKpFi_A', //  Rens
'UC6QZ_ss3i_8qLV_RczPZBkw', // ISSEI
'UCOicc9kd58k_XR3D7bTx8oA', // Rico Animations
'UCDCLw9qHo5A6HrIcuOvA6Hw', // BRANDOMEMES 
'UCy9qkaWFOGHHzk-QjPMQxyw', // JRMemes 
'UCNQAoLEv87L7NgUp4We3HIg', // CRAZY GREAPA 
'UCuZBxbwknYtE30Qdh0dQ1Tg', // Jacksinfo 
'UC_485Ao_SxlCaBlOZORVsVQ', // Zdak
'UC7zQcu8FeM_RmUJmwJmCh7w', // UrBoyTrev206
'UCNlDLIic5wnXmScZYjXBrjg', // Catalyst
'UCBaJVMx5fcWOHsmPH3IxKKQ', // Wubzzy
'UCYGElWL8dYqreUh9wNb3s2A', // Vines Best Laugh 
'UC2bxGXFgyCS73exzJ_i0zww', // 	Nba Rich
'UCbv_WFkthQxrqRVwLAcRT_Q', // Phenomenon EditZ
'UCfF7GECIz-rj74KMh9S4ilg', // MiAnimation
'UCUnmH8N8k4E7y3dKfCzDKKg', // Brandon B
'UCoJ5osZ535ar2kzHwQMnLsA', // Double Date 
'UCefnOSmxkOzKR3aUdxgVnsQ', // Marulho
'UCQOidFKQBMvLXk7PxGBXWyA', // The Gabriels
'UCYCh5_-In6wtzWR-s_kM03w', // HT Official
'UCym7PDoe2kcT_Z30LQyGy1w', // SIXPATHSSS
'UCq45uL90wzglh4JTSn34YZQ', // MoniLinaFamily
'UCvLHvyLxBwHKAEx5u09vqVw', // Jehiely N Alex
'UCymK_3BWUcoYVVf5D_GmACQ', // Tsuriki Show
'UCjdrGjv4bGt5HvApBe1HADQ'  // ElegantBeautybyBritt
];

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});
const db = admin.firestore();

const channelCache = new Map();

async function fetchVideos() {
    try {
        if (!isRightTime()) {
            console.log('⏳ Not the scheduled time (6 PM Morocco)');
            return;
        }

        if (await isDailyLimitReached()) {
            console.log(`🎯 Daily limit reached (${MAX_DAILY_VIDEOS} videos)`);
            return;
        }

        const videos = await fetchAllVideos();
        
        if (videos.length > 0) {
            await saveVideos(videos);
            console.log(
                `✅ Added ${videos.length} videos\n` +
                `📊 Quota used: ${calculateQuota(videos.length)} units\n` +
                `⏰ ${format(new Date(), 'yyyy-MM-dd HH:mm')}`
            );
        } else {
            console.log('⚠️ No new videos found today');
        }

        await logExecution(videos.length);

    } catch (error) {
        console.error('❌ Main error:', error);
        await logError(error);
        process.exit(0);
    }
}

function isRightTime() {
    const now = new Date();
    const moroccoTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
    return moroccoTime.getHours() === TARGET_HOUR;
}

async function isDailyLimitReached() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const snapshot = await db.collection('videos')
        .where('timestamp', '>=', todayStart)
        .count()
        .get();

    return snapshot.data().count >= MAX_DAILY_VIDEOS;
}

async function fetchAllVideos() {
    const videos = [];
    
    for (const channelId of CHANNELS) {
        try {
            await delay(REQUEST_DELAY);
            const video = await fetchChannelVideo(channelId);
            if (video) videos.push(video);
        } catch (error) {
            console.error(`❌ ${channelId}:`, error.message);
        }
    }
    
    return videos;
}

async function fetchChannelVideo(channelId) {
    const videoId = await getLatestVideoId(channelId);
    if (!videoId) return null;

    if (await isVideoExists(videoId)) {
        console.log(`⏭️ Skipping existing video: ${videoId}`);
        return null;
    }

    return await getVideoDetails(videoId);
}

async function getLatestVideoId(channelId) {
    const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}` +
        `&channelId=${channelId}&part=snippet&order=date` +
        `&maxResults=1&type=video&videoDuration=short` +
        `&fields=items(id(videoId),snippet(title))`
    );

    return response.data.items[0]?.id.videoId;
}

async function isVideoExists(videoId) {
    const doc = await db.collection('videos').doc(videoId).get();
    return doc.exists;
}

async function getVideoDetails(videoId) {
    const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}` +
        `&id=${videoId}&part=snippet,contentDetails,statistics` +
        `&fields=items(snippet(title,description,thumbnails/high,channelId),contentDetails/duration,statistics)`
    );

    const item = response.data.items[0];
    if (!item) return null;

    const duration = parseDuration(item.contentDetails.duration);
    if (duration > 180) return null;

    const channelInfo = await getChannelInfo(item.snippet.channelId);
    
    return {
        videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high.url,
        duration: item.contentDetails.duration,
        durationSeconds: duration,
        creatorUsername: channelInfo.title,
        creatorAvatar: channelInfo.avatar,
        isVerified: channelInfo.isVerified,
        likes: parseInt(item.statistics?.likeCount || 0),
        comments: parseInt(item.statistics?.commentCount || 0),
        isAI: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
}

async function getChannelInfo(channelId) {
    if (channelCache.has(channelId)) {
        return channelCache.get(channelId);
    }

    const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}` +
        `&id=${channelId}&part=snippet,status` +
        `&fields=items(snippet(title,thumbnails/high/url),status)`
    );

    const data = response.data.items[0];
    const result = {
        title: data.snippet.title,
        avatar: data.snippet.thumbnails.high.url,
        isVerified: data.status?.longUploadsStatus === "eligible"
    };

    channelCache.set(channelId, result);
    return result;
}

async function saveVideos(videos) {
    const batch = db.batch();
    
    videos.forEach(video => {
        const ref = db.collection('videos').doc(video.videoId);
        batch.set(ref, video);
    });
    
    await batch.commit();
}

async function logExecution(count) {
    await db.collection('logs').add({
        date: admin.firestore.FieldValue.serverTimestamp(),
        videoCount: count,
        quotaUsed: calculateQuota(count)
    });
}

async function logError(error) {
    await db.collection('errors').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        message: error.message,
        stack: error.stack
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    return (parseInt(match?.[1] || 0) * 3600) +
          (parseInt(match?.[2] || 0) * 60) +
          (parseInt(match?.[3] || 0));
}

function calculateQuota(videoCount) {
    return videoCount * 102;
}

fetchVideos();
