import axios from "axios";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

process.env.TZ = "Europe/Stockholm";

const xscope = "8a22163c-8662-4535-9050-bc5e1923df48";

let requestJson = {
  renderKey: "",
  host: "goteborg.skola24.se",
  unitGuid: "NzEzMzRiM2ItM2Y5Yy1mZGY5LTk1NTYtNmQ1MDY1YmJhNWQ4",
  schoolYear: "41656891-7bda-426c-8563-893fc43ef182",
  startDate: null,
  endDate: null,
  scheduleDay: 0,
  blackAndWhite: false,
  width: 1023,
  height: 699,
  selectionType: 0,
  selection: "YjkwM2YzYzMtOTcxOS1mMjVhLWEzY2MtNTI4YzZiZTkzNjA0",
  showHeader: false,
  periodText: "",
  week: 4,
  year: 2026,
  privateFreeTextMode: null,
  privateSelectionMode: false,
  customerKey: "",
  personalTimetable: false,
};

async function fetchData() {
  try {
    const headers = {
      "x-scope": xscope,
      "Content-Type": "application/json",
    };

    const keyRes = await axios.post(
      "https://web.skola24.se/api/get/timetable/render/key",
      null,
      { headers },
    );

    const renderKey = keyRes.data?.data?.key;

    requestJson.renderKey = renderKey;

    requestJson.week = getISOWeek();

    const result = await axios.post(
      "https://web.skola24.se/api/render/timetable",
      requestJson,
      { headers },
    );

    // Filter out "körning" lessons
    let filteredLessons = result.data.data.lessonInfo.filter(
      (lesson) =>
        !lesson.texts.some((text) => text.toLowerCase().includes("körning")),
    );

    if (process.env.DEV === "true") {
      filteredLessons.push({
        guidId: "test-lesson",
        texts: ["Test Lesson"],
        timeStart: "00:00:00",
        timeEnd: "23:59:59",
        dayOfWeekNumber: new Date().getDay(),
        blockName: "",
      });
    }

    // Check if any lessons are right now
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    const ongoingLessons = filteredLessons.filter((lesson) => {
      if (lesson.dayOfWeekNumber !== currentDay) return false;
      return lesson.timeStart <= currentTime && lesson.timeEnd >= currentTime;
    });

    return ongoingLessons;
  } catch (error) {
    console.error("Error fetching data:", error.response?.data || error);
  }
}

function getISOWeek(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function unixForTodayAt(timeStr, baseDate = new Date()) {
  const [hh, mm, ss = "0"] = timeStr.split(":");
  const d = new Date(baseDate);
  d.setHours(Number(hh), Number(mm), Number(ss), 0);
  return Math.floor(d.getTime() / 1000);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Check if process.env.DISCORD_USER_ID is mentioned
  let tagged = false;
  message.mentions.users.forEach((user) => {
    if (user.id === process.env.DISCORD_USER_ID) {
      tagged = true;
    }
  });

  // Check if reply to the user
  if (message.reference) {
    try {
      const referencedMessage = await message.channel.messages.fetch(
        message.reference.messageId,
      );
      if (referencedMessage.author.id === process.env.DISCORD_USER_ID) {
        tagged = true;
      }
    } catch (error) {
      console.error("Error fetching referenced message:", error);
    }
  }

  if (!tagged) return;

  const ongoingLessons = await fetchData();

  if (ongoingLessons && ongoingLessons.length > 0) {
    const now = new Date();

    let reply = "Mackan kan inte svara just nu, han har följande lektion:\n";

    ongoingLessons.forEach((lesson) => {
      const endUnix = unixForTodayAt(lesson.timeEnd, now);
      // Optional: also show start relative
      const startUnix = unixForTodayAt(lesson.timeStart, now);

      reply += `- ${lesson.texts[0]} (slutar <t:${endUnix}:R>, alltså <t:${endUnix}:t>)\n`;
    });

    message.reply(reply);
  }
});

client.login(process.env.DISCORD_TOKEN);
