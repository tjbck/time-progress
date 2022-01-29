<script>
  const SunCalc = require("suncalc");
  import { onMount } from "svelte";
  let loaded = false;

  import CloseButton from "./components/CloseButton.svelte";
  import ProgressBar from "./components/ProgressBar.svelte";
  import OffCanvas from "./components/OffCanvas.svelte";

  // ipcRenderer Functions
  const getLocationIP = async () => {
    let res = await ipcRenderer.sendSync("get-location-ip");
    console.log("getLocationIP", res);
    const coords = [res.latitude, res.longitude];
    localStorage.COORDINATE = JSON.stringify(coords);
    console.log(res, coords);
    return coords;
  };

  const getLocation = async (query) => {
    console.log("getLocation");
    const res = await ipcRenderer.sendSync("get-location", query);
    console.log(res);
  };

  let COORDINATE;
  let CURRENT_DATETIME = new Date();

  // SUN TIMES
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  let YESTERDAY = new Date(CURRENT_DATETIME.getTime() - DAY);
  let TOMORROW = new Date(CURRENT_DATETIME.getTime() + DAY);

  let SUN_YESTERDAY;
  let SUN;
  let SUN_TOMORROW;

  // PROGRESS
  let PROGRESS_DAYLIGHT = null;
  let PROGRESS_NIGHTTIME = null;

  let PROGRESS_TODAY = null;
  let PROGRESS_WEEK = null;
  let PROGRESS_MONTH = null;
  let PROGRESS_YEAR = null;

  // Set Progress Functions
  const getDaysPassed = () => {
    const YEAR_START = new Date(CURRENT_DATETIME.getFullYear(), 0, 0);
    const DIFF =
      CURRENT_DATETIME -
      YEAR_START +
      (YEAR_START.getTimezoneOffset() - CURRENT_DATETIME.getTimezoneOffset()) *
        MINUTE;
    return Math.floor(DIFF / DAY);
  };

  const getProgressDaylight = () => {
    // PROGRESS DAYLIGHT (0-1)
    PROGRESS_DAYLIGHT =
      (CURRENT_DATETIME - SUN.sunrise) / Math.abs(SUN.sunrise - SUN.sunset);
  };

  const getProgressNighttime = () => {
    // PROGRESS NIGHTTIME (0-1)
    PROGRESS_NIGHTTIME =
      (CURRENT_DATETIME - SUN.sunset) /
      Math.abs(SUN.sunset - SUN_TOMORROW.sunrise);

    if (!(PROGRESS_NIGHTTIME > 0 && PROGRESS_NIGHTTIME < 1)) {
      PROGRESS_NIGHTTIME =
        (CURRENT_DATETIME - SUN_YESTERDAY.sunset) /
        Math.abs(SUN_YESTERDAY.sunset - SUN.sunrise);
    }
  };

  const getProgressToday = () => {
    // PROGRESS TODAY 0-24 -> (0-1)
    PROGRESS_TODAY =
      (CURRENT_DATETIME.getHours() * 60 + CURRENT_DATETIME.getMinutes()) /
      (24 * 60);
  };

  const getProgressWeek = () => {
    // PROGRESS WEEK Mon-Sun -> (0-1)
    PROGRESS_WEEK =
      ((CURRENT_DATETIME.getDay() === 0 ? 6 : CURRENT_DATETIME.getDay() - 1) +
        PROGRESS_TODAY) /
      7;
  };

  const getProgressMonth = () => {
    // PROGRESS MONTH (0-1)
    PROGRESS_MONTH =
      (CURRENT_DATETIME.getDate() - 1 + PROGRESS_TODAY) /
      new Date(
        CURRENT_DATETIME.getFullYear(),
        CURRENT_DATETIME.getMonth() + 1,
        0
      ).getDate();
  };

  const getProgressYear = () => {
    // PROGRESS YEAR (0-1)
    PROGRESS_YEAR =
      (getDaysPassed() - 1 + PROGRESS_TODAY) /
      (CURRENT_DATETIME % 4 == 0 ? 366 : 365);
  };

  $: CURRENT_DATETIME,
    (function () {
      if (SUN) {
        if (CURRENT_DATETIME.toDateString() === TOMORROW.toDateString()) {
          YESTERDAY = new Date(CURRENT_DATETIME.getTime() - DAY);
          TOMORROW = new Date(CURRENT_DATETIME.getTime() + DAY);

          SUN_YESTERDAY = SUN;
          SUN = SUN_TOMORROW;
          SUN_TOMORROW = SunCalc.getTimes(
            TOMORROW,
            COORDINATE[0],
            COORDINATE[1]
          );
        }
        getProgressDaylight();
        getProgressNighttime();
      }
      getProgressToday();
      getProgressWeek();
      getProgressMonth();
      getProgressYear();
    })();

  onMount(async () => {
    // Attempt to load saved variable from LocalStroage. If not found, getLocationIP
    COORDINATE = localStorage.COORDINATE
      ? JSON.parse(localStorage.COORDINATE)
      : await getLocationIP();

    console.log(COORDINATE);

    SUN_YESTERDAY = SunCalc.getTimes(YESTERDAY, COORDINATE[0], COORDINATE[1]);
    SUN_TOMORROW = SunCalc.getTimes(TOMORROW, COORDINATE[0], COORDINATE[1]);
    SUN = SunCalc.getTimes(CURRENT_DATETIME, COORDINATE[0], COORDINATE[1]);

    loaded = true;
    new Notification("⌛ time progress", {
      body: "hello there! :)",
    });

    setInterval(() => {
      CURRENT_DATETIME = new Date();
    }, 1000);
  });

  const handleKeyUp = async (e) => {
    // Ctrl + T
    if (e.ctrlKey && e.key === "t") {
      console.log("alwaysOnTop");
      window.ipcRenderer.send("always-on-top");
    }

    // Ctrl + T
    if (e.altKey && e.key === "t") {
      console.log("Theme");
    }


    // Ctrl + L
    if (e.ctrlKey && e.key === "l") {
      console.log("getLocation");
      COORDINATE = await getLocationIP();
    }


    // Ctrl + Q
    if (e.ctrlKey && e.key === "q") {
      console.log("quitApp");
      window.ipcRenderer.send("quit-app");
    }
  };
</script>

<svelte:window on:keyup={handleKeyUp} />

{#if loaded}
  <div class="min-h-screen min-w-screen bg-stone-900 text-center">
    <main class="h-screen flex justify-center items-center text-white">
      <div class="m-auto">
        <CloseButton />

        <div class="text-left">
          {#if PROGRESS_DAYLIGHT > 0 && PROGRESS_DAYLIGHT < 1}
            <div class="my-1">
              <div>Daylight</div>
            </div>
            <ProgressBar progress={PROGRESS_DAYLIGHT * 100} />
          {:else}
            <div class="my-1">
              <div>Nighttime</div>
            </div>
            <ProgressBar progress={PROGRESS_NIGHTTIME * 100} />
          {/if}
        </div>

        <div class="text-left">
          <div class="my-1">
            <div>Today</div>
          </div>
          <ProgressBar progress={PROGRESS_TODAY * 100} />
        </div>

        <div class="text-left">
          <div class="my-1">This week</div>
          <ProgressBar progress={PROGRESS_WEEK * 100} />
        </div>

        <div class="text-left">
          <div class="my-1">This month</div>
          <ProgressBar progress={PROGRESS_MONTH * 100} />
        </div>

        <div class="text-left">
          <div class="my-1">This year</div>
          <ProgressBar progress={PROGRESS_YEAR * 100} />
        </div>

        <div class="mt-3">
          {CURRENT_DATETIME.toLocaleString()}
        </div>

        <OffCanvas />
      </div>
    </main>
  </div>
{:else}
  <div class="min-h-screen min-w-screen bg-stone-900 text-center">
    <main class="h-screen flex justify-center items-center text-white">
      <span
        class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-gray-100 opacity-100"
      />
    </main>
  </div>
{/if}
