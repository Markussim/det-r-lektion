import axios from "axios";
import fs from "fs";

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
    console.log("Key:", renderKey);

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

    /* Example output
    Filtered Lessons: [
      {
        guidId: 'MGJiOWZiNGYtYWM5MC1mZGVjLWE2NzktNjliZGNjOGY1NGE5',
        texts: [ 'Studiebesök Volvo' ],
        timeStart: '11:00:00',
        timeEnd: '15:45:00',
        dayOfWeekNumber: 1,
        blockName: ''
      },
      {
        guidId: 'NjJiZGI2MzgtZGJjNC1mZGY3LTg2NGUtYzBhNDRlNGRlMmI5',
        texts: [ 'Studiebesök Renova' ],
        timeStart: '12:00:00',
        timeEnd: '15:45:00',
        dayOfWeekNumber: 2,
        blockName: ''
      },
      {
        guidId: 'MzBjMGY3YjUtNGI0Ni1mYWI2LWFiMjItMzU2NjM4NjA3NGEz',
        texts: [ 'GODE1000X', 'THO', 'Terminalen,' ],
        timeStart: '08:30:00',
        timeEnd: '11:30:00',
        dayOfWeekNumber: 3,
        blockName: ''
      },
      {
        guidId: 'MzUyMjA4NmYtZWExMy1mNWM4LWEyZGUtN2FmODZmN2MzY2Ux',
        texts: [ 'GODE1000X', 'THO', 'Terminalen,' ],
        timeStart: '12:45:00',
        timeEnd: '15:45:00',
        dayOfWeekNumber: 3,
        blockName: ''
      },
      {
        guidId: 'OWI2ZWY1NmItMmIzYy1mZDk3LWJiZDctOWNiNWI0YjI1YTFm',
        texts: [ 'YRKS100VX', 'THO', '120,' ],
        timeStart: '12:45:00',
        timeEnd: '15:45:00',
        dayOfWeekNumber: 5,
        blockName: ''
      }
    ]
    */

    filteredLessons.push({
      guidId: "test-lesson",
      texts: ["Test Lesson"],
      timeStart: "00:00:00",
      timeEnd: "23:59:59",
      dayOfWeekNumber: new Date().getDay(),
      blockName: "",
    });

    // Check if any lessons are right now
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    const ongoingLessons = filteredLessons.filter((lesson) => {
      if (lesson.dayOfWeekNumber !== currentDay) return false;
      return lesson.timeStart <= currentTime && lesson.timeEnd >= currentTime;
    });

    console.log("Ongoing Lessons:", ongoingLessons);
  } catch (error) {
    console.error("Error fetching data:", error.response?.data || error);
  }
}

fetchData();

function getISOWeek(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
