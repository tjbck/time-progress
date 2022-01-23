<script>
  //   import { Offcanvas } from "../../node_modules/bootstrap/dist/js/bootstrap.esm.js";

  //   import { onMount } from "svelte";

  let offCanvas;

  //   onMount(() => {
  //     console.log(offCanvas);
  //     new Offcanvas(offCanvas);
  //   });
</script>

<div
  bind:this={offCanvas}
  class="offcanvas offcanvas-bottom"
  tabindex="-1"
  id="offcanvasBottom"
  aria-labelledby="offcanvasBottomLabel"
>
  <div class="offcanvas-header">
    <h5 class="offcanvas-title" id="offcanvasBottomLabel">Offcanvas bottom</h5>
    <button
      type="button"
      class="btn-close text-reset"
      data-bs-dismiss="offcanvas"
      aria-label="Close"
    />
  </div>
  <div class="offcanvas-body small">...</div>
</div>

<div
  class="offcanvas offcanvas-start"
  tabindex="-1"
  id="offcanvas"
  aria-labelledby="offcanvasLabel"
>
  <div class="offcanvas-header">
    <h5 class="offcanvas-title" id="offcanvasLabel">Offcanvas</h5>
    <button
      type="button"
      class="btn-close text-reset"
      data-bs-dismiss="offcanvas"
      aria-label="Close"
    />
  </div>
  <div class="offcanvas-body">
    Content for the offcanvas goes here. You can place just about any Bootstrap
    component or custom elements here.
  </div>
</div>
