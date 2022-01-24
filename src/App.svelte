<script>
  const SunCalc = require("suncalc");

  import { onMount } from "svelte";

  import CloseButton from "./components/CloseButton.svelte";
  import ProgressBar from "./components/ProgressBar.svelte";
  import OffCanvas from "./components/OffCanvas.svelte";

  let CURRENT_DATETIME = new Date();
  let SUN = SunCalc.getTimes(CURRENT_DATETIME, 37.566536, 126.977966);

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
        60 *
        1000;
    const ONE_DAY = 1000 * 60 * 60 * 24;
    const day = Math.floor(DIFF / ONE_DAY);
    return day;
  };

  $: CURRENT_DATETIME,
    (function () {
      PROGRESS_TODAY =
        (((CURRENT_DATETIME.getHours() + 1) * 60 +
          CURRENT_DATETIME.getMinutes()) /
          (24 * 60)) *
        100;
    })();

  onMount(() => {
    console.log(SUN);
    setInterval(() => {
      CURRENT_DATETIME = new Date();
    }, 1000);
  });

  const handleKeyUp = (e) => {
    // this would test for whichever key is 40 (down arrow) and the ctrl key at the same time
    if (e.ctrlKey && e.key === "t") {
      // call your function to do the thing
      console.log("screenOnTop");
      window.ipcRenderer.send("screen-on-top");
    }
  };
</script>

<svelte:window on:keyup={handleKeyUp} />

<div class="min-h-screen min-w-screen bg-stone-900 text-center">
  <main class="h-screen flex justify-center items-center text-white">
    <div class="m-auto">
      <CloseButton />

      <div class="text-left">
        <div class="my-1">
          <div>Daylight</div>
        </div>
        <ProgressBar
          progress={(Math.abs(CURRENT_DATETIME - SUN.sunrise) /
            Math.abs(SUN.sunrise - SUN.sunset)) *
            100}
        />
      </div>
      <div class="text-left">
        <div class="my-1">
          <div>Today</div>
        </div>
        <ProgressBar
          progress={(((CURRENT_DATETIME.getHours() + 1) * 60 +
            CURRENT_DATETIME.getMinutes()) /
            (24 * 60)) *
            100}
        />
      </div>

      <div class="text-left">
        <div class="my-1">This week</div>
        <ProgressBar
          progress={((CURRENT_DATETIME.getDay() === 0
            ? 7
            : CURRENT_DATETIME.getDay()) /
            7) *
            100}
        />
      </div>

      <div class="text-left">
        <div class="my-1">This month</div>
        <ProgressBar
          progress={(CURRENT_DATETIME.getDate() /
            new Date(
              CURRENT_DATETIME.getFullYear(),
              CURRENT_DATETIME.getMonth() + 1,
              0
            ).getDate()) *
            100}
        />
      </div>

      <div class="text-left">
        <div class="my-1">This year</div>
        <ProgressBar
          progress={(getDaysPassed() /
            (CURRENT_DATETIME % 4 == 0 ? 366 : 365)) *
            100}
        />
      </div>

      <div class="mt-3">
        {CURRENT_DATETIME.toLocaleString()}
      </div>

      <OffCanvas />
    </div>
  </main>
</div>
