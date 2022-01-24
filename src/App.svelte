<script>
  const SunCalc = require("suncalc");

  import { onMount } from "svelte";

  import CloseButton from "./components/CloseButton.svelte";
  import ProgressBar from "./components/ProgressBar.svelte";
  import OffCanvas from "./components/OffCanvas.svelte";

  const COORDINATE = [37.566536, 126.977966]; //LAT,LON
  let CURRENT_DATETIME = new Date();

  // SUN TIMES
  const SECOND =  1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY =  24 * HOUR;

  let YESTERDAY = new Date(CURRENT_DATETIME.getTime() - DAY);
  let TOMORROW = new Date(CURRENT_DATETIME.getTime() + DAY);

  let SUN_YESTERDAY = SunCalc.getTimes(YESTERDAY, COORDINATE[0], COORDINATE[1]);
  let SUN = SunCalc.getTimes(CURRENT_DATETIME, COORDINATE[0], COORDINATE[1]);
  let SUN_TOMORROW = SunCalc.getTimes(TOMORROW, COORDINATE[0], COORDINATE[1]);

  // PROGRESS
  let PROGRESS_DAYLIGHT = null;
  let PROGRESS_NIGHTTIME = null;

  let PROGRESS_TODAY = null;
  let PROGRESS_WEEK = null;
  let PROGRESS_MONTH = null;
  let PROGRESS_YEAR = null;

  const getDaysPassed = () => {
    const YEAR_START = new Date(CURRENT_DATETIME.getFullYear(), 0, 0);
    const DIFF =
      CURRENT_DATETIME -
      YEAR_START +
      (YEAR_START.getTimezoneOffset() - CURRENT_DATETIME.getTimezoneOffset()) *
      MINUTE;
    return Math.floor(DIFF / DAY);
  };

  $: CURRENT_DATETIME,
    (function () {
      if (CURRENT_DATETIME.toDateString() === TOMORROW.toDateString()) {
        YESTERDAY = new Date(CURRENT_DATETIME.getTime() - DAY);
        TOMORROW = new Date(CURRENT_DATETIME.getTime() + DAY);

        SUN_YESTERDAY = SUN;
        SUN = SUN_TOMORROW;
        SUN_TOMORROW = SunCalc.getTimes(TOMORROW, COORDINATE[0], COORDINATE[1]);
      }

      // PROGRESS DAYLIGHT (0-1)
      PROGRESS_DAYLIGHT =
      (CURRENT_DATETIME - SUN.sunrise) / Math.abs(SUN.sunrise - SUN.sunset);

      console.log('PROGRESS_DAYLIGHT',PROGRESS_DAYLIGHT)

      // console.log(
      //   CURRENT_DATETIME - SUN.sunset
      // );

      // PROGRESS NIGHTTIME (0-1)
      PROGRESS_NIGHTTIME =
      (CURRENT_DATETIME - SUN.sunset) / Math.abs(SUN.sunset - SUN_TOMORROW.sunrise);

      if(!(PROGRESS_NIGHTTIME > 0 && PROGRESS_NIGHTTIME < 1)){
        PROGRESS_NIGHTTIME = (CURRENT_DATETIME - SUN_YESTERDAY.sunset) /
        Math.abs(SUN_YESTERDAY.sunset - SUN.sunrise)
      }

      console.log('PROGRESS_NIGHTTIME',PROGRESS_NIGHTTIME)

      // PROGRESS TODAY 0-24 -> (0-1) 
      PROGRESS_TODAY =
        ((CURRENT_DATETIME.getHours() + 1) * 60 +
          CURRENT_DATETIME.getMinutes()) /
        (24 * 60);


      // PROGRESS WEEK Mon-Sun -> (0-1) 
      PROGRESS_WEEK =
        (CURRENT_DATETIME.getDay() === 0 ? 6 : CURRENT_DATETIME.getDay() - 1) +
        PROGRESS_TODAY / 7;

      // PROGRESS MONTH (0-1)
      PROGRESS_MONTH =
        (CURRENT_DATETIME.getDate() - 1 + PROGRESS_TODAY) /
        new Date(
          CURRENT_DATETIME.getFullYear(),
          CURRENT_DATETIME.getMonth() + 1,
          0
        ).getDate();

      PROGRESS_YEAR =
        (getDaysPassed() - 1 + PROGRESS_TODAY) /
        (CURRENT_DATETIME % 4 == 0 ? 366 : 365);
    })();

  onMount(() => {
    console.log(SUN_YESTERDAY);
    console.log(SUN);
    console.log(SUN_TOMORROW);

    setInterval(() => {
      CURRENT_DATETIME = new Date();
    }, 1000);
  });

  const handleKeyUp = (e) => {
    // this would test for whichever key is 40 (down arrow) and the ctrl key at the same time
    if (e.ctrlKey && e.key === "t") {
      // call your function to do the thing
      console.log("alwaysOnTop");
      window.ipcRenderer.send("always-on-top");
    }
  };
</script>

<svelte:window on:keyup={handleKeyUp} />

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
