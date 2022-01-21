<script>
  import { onMount } from "svelte";

  // const { ipcRenderer } = window.require("electron");

  import ProgressBar from "./components/ProgressBar.svelte";

  let CURRENT_DATETIME = new Date();

  let PROGRESS_TODAY = null;
  let PROGRESS_WEEK = null;
  let PROGRESS_MONTH = null;
  let PROGRESS_YEAR = null;

  $: CURRENT_DATETIME,
    (function () {
      PROGRESS_TODAY =
        (((CURRENT_DATETIME.getHours() + 1) * 60 +
          CURRENT_DATETIME.getMinutes()) /
          (24 * 60)) *
        100;

      console.log("hello");
    })();

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

  onMount(() => {
    setInterval(() => {
      CURRENT_DATETIME = new Date();
    }, 1000);
  });
</script>

<div class="min-h-screen min-w-screen bg-stone-900">
  <main class="h-screen flex justify-center items-center text-white">
    <div class="m-auto">
      <div
        class="flex absolute"
        style="margin-left: 70vw; -webkit-app-region: no-drag;"
      >
        <div
          on:click={() => {
            console.log("toggle");
            window.ipcRenderer.send("toggle-window");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
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
          progress={(CURRENT_DATETIME.getDay() === 0
            ? 7
            : CURRENT_DATETIME.getDay() / 7) * 100}
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

      <div class="mt-4">
        {CURRENT_DATETIME.toLocaleString()}
      </div>
    </div>
  </main>
</div>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }
  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }
  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
