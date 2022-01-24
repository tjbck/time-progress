
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* src\components\CloseButton.svelte generated by Svelte v3.46.2 */

    function create_fragment$3(ctx) {
    	let div1;
    	let div0;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
    			attr(div1, "class", "flex absolute");
    			set_style(div1, "margin-left", "75vw");
    			set_style(div1, "-webkit-app-region", "no-drag");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);

    			if (!mounted) {
    				dispose = listen(div0, "click", /*click_handler*/ ctx[0]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$3($$self) {
    	const click_handler = () => {
    		console.log("toggle");
    		window.ipcRenderer.send("toggle-window");
    	};

    	return [click_handler];
    }

    class CloseButton extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* src\components\ProgressBar.svelte generated by Svelte v3.46.2 */

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			attr(div0, "class", "bg-yellow-300 h-1");
    			set_style(div0, "width", /*progress*/ ctx[0] + "%");
    			attr(div1, "class", "w-full bg-gray-600 h-1");
    			set_style(div1, "min-width", "80vw");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*progress*/ 1) {
    				set_style(div0, "width", /*progress*/ ctx[0] + "%");
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { progress = 0 } = $$props;

    	$$self.$$set = $$props => {
    		if ('progress' in $$props) $$invalidate(0, progress = $$props.progress);
    	};

    	return [progress];
    }

    class ProgressBar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { progress: 0 });
    	}
    }

    /* src\components\OffCanvas.svelte generated by Svelte v3.46.2 */

    function create_fragment$1(ctx) {
    	let div2;
    	let t4;
    	let div5;

    	return {
    		c() {
    			div2 = element("div");

    			div2.innerHTML = `<div class="offcanvas-header"><h5 class="offcanvas-title" id="offcanvasBottomLabel">Offcanvas bottom</h5> 
    <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button></div> 
  <div class="offcanvas-body small">...</div>`;

    			t4 = space();
    			div5 = element("div");

    			div5.innerHTML = `<div class="offcanvas-header"><h5 class="offcanvas-title" id="offcanvasLabel">Offcanvas</h5> 
    <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button></div> 
  <div class="offcanvas-body">Content for the offcanvas goes here. You can place just about any Bootstrap
    component or custom elements here.</div>`;

    			attr(div2, "class", "offcanvas offcanvas-bottom");
    			attr(div2, "tabindex", "-1");
    			attr(div2, "id", "offcanvasBottom");
    			attr(div2, "aria-labelledby", "offcanvasBottomLabel");
    			attr(div5, "class", "offcanvas offcanvas-start");
    			attr(div5, "tabindex", "-1");
    			attr(div5, "id", "offcanvas");
    			attr(div5, "aria-labelledby", "offcanvasLabel");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			/*div2_binding*/ ctx[1](div2);
    			insert(target, t4, anchor);
    			insert(target, div5, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div2);
    			/*div2_binding*/ ctx[1](null);
    			if (detaching) detach(t4);
    			if (detaching) detach(div5);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let offCanvas;

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			offCanvas = $$value;
    			$$invalidate(0, offCanvas);
    		});
    	}

    	return [offCanvas, div2_binding];
    }

    class OffCanvas extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.2 */

    const { window: window_1 } = globals;

    function create_fragment(ctx) {
    	let div14;
    	let main;
    	let div13;
    	let closebutton;
    	let t0;
    	let div2;
    	let div1;
    	let t2;
    	let progressbar0;
    	let t3;
    	let div5;
    	let div4;
    	let t5;
    	let progressbar1;
    	let t6;
    	let div7;
    	let div6;
    	let t8;
    	let progressbar2;
    	let t9;
    	let div9;
    	let div8;
    	let t11;
    	let progressbar3;
    	let t12;
    	let div11;
    	let div10;
    	let t14;
    	let progressbar4;
    	let t15;
    	let div12;
    	let t16_value = /*CURRENT_DATETIME*/ ctx[0].toLocaleString() + "";
    	let t16;
    	let t17;
    	let offcanvas;
    	let current;
    	let mounted;
    	let dispose;
    	closebutton = new CloseButton({});

    	progressbar0 = new ProgressBar({
    			props: {
    				progress: Math.abs(/*CURRENT_DATETIME*/ ctx[0] - /*SUN*/ ctx[1].sunrise) / Math.abs(/*SUN*/ ctx[1].sunrise - /*SUN*/ ctx[1].sunset) * 100
    			}
    		});

    	progressbar1 = new ProgressBar({
    			props: {
    				progress: ((/*CURRENT_DATETIME*/ ctx[0].getHours() + 1) * 60 + /*CURRENT_DATETIME*/ ctx[0].getMinutes()) / (24 * 60) * 100
    			}
    		});

    	progressbar2 = new ProgressBar({
    			props: {
    				progress: (/*CURRENT_DATETIME*/ ctx[0].getDay() === 0
    				? 7
    				: /*CURRENT_DATETIME*/ ctx[0].getDay()) / 7 * 100
    			}
    		});

    	progressbar3 = new ProgressBar({
    			props: {
    				progress: /*CURRENT_DATETIME*/ ctx[0].getDate() / new Date(/*CURRENT_DATETIME*/ ctx[0].getFullYear(), /*CURRENT_DATETIME*/ ctx[0].getMonth() + 1, 0).getDate() * 100
    			}
    		});

    	progressbar4 = new ProgressBar({
    			props: {
    				progress: /*getDaysPassed*/ ctx[2]() / (/*CURRENT_DATETIME*/ ctx[0] % 4 == 0 ? 366 : 365) * 100
    			}
    		});

    	offcanvas = new OffCanvas({});

    	return {
    		c() {
    			div14 = element("div");
    			main = element("main");
    			div13 = element("div");
    			create_component(closebutton.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div1.innerHTML = `<div>Daylight</div>`;
    			t2 = space();
    			create_component(progressbar0.$$.fragment);
    			t3 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div4.innerHTML = `<div>Today</div>`;
    			t5 = space();
    			create_component(progressbar1.$$.fragment);
    			t6 = space();
    			div7 = element("div");
    			div6 = element("div");
    			div6.textContent = "This week";
    			t8 = space();
    			create_component(progressbar2.$$.fragment);
    			t9 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div8.textContent = "This month";
    			t11 = space();
    			create_component(progressbar3.$$.fragment);
    			t12 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div10.textContent = "This year";
    			t14 = space();
    			create_component(progressbar4.$$.fragment);
    			t15 = space();
    			div12 = element("div");
    			t16 = text(t16_value);
    			t17 = space();
    			create_component(offcanvas.$$.fragment);
    			attr(div1, "class", "my-1");
    			attr(div2, "class", "text-left");
    			attr(div4, "class", "my-1");
    			attr(div5, "class", "text-left");
    			attr(div6, "class", "my-1");
    			attr(div7, "class", "text-left");
    			attr(div8, "class", "my-1");
    			attr(div9, "class", "text-left");
    			attr(div10, "class", "my-1");
    			attr(div11, "class", "text-left");
    			attr(div12, "class", "mt-3");
    			attr(div13, "class", "m-auto");
    			attr(main, "class", "h-screen flex justify-center items-center text-white");
    			attr(div14, "class", "min-h-screen min-w-screen bg-stone-900 text-center");
    		},
    		m(target, anchor) {
    			insert(target, div14, anchor);
    			append(div14, main);
    			append(main, div13);
    			mount_component(closebutton, div13, null);
    			append(div13, t0);
    			append(div13, div2);
    			append(div2, div1);
    			append(div2, t2);
    			mount_component(progressbar0, div2, null);
    			append(div13, t3);
    			append(div13, div5);
    			append(div5, div4);
    			append(div5, t5);
    			mount_component(progressbar1, div5, null);
    			append(div13, t6);
    			append(div13, div7);
    			append(div7, div6);
    			append(div7, t8);
    			mount_component(progressbar2, div7, null);
    			append(div13, t9);
    			append(div13, div9);
    			append(div9, div8);
    			append(div9, t11);
    			mount_component(progressbar3, div9, null);
    			append(div13, t12);
    			append(div13, div11);
    			append(div11, div10);
    			append(div11, t14);
    			mount_component(progressbar4, div11, null);
    			append(div13, t15);
    			append(div13, div12);
    			append(div12, t16);
    			append(div13, t17);
    			mount_component(offcanvas, div13, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen(window_1, "keyup", /*handleKeyUp*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			const progressbar0_changes = {};
    			if (dirty & /*CURRENT_DATETIME*/ 1) progressbar0_changes.progress = Math.abs(/*CURRENT_DATETIME*/ ctx[0] - /*SUN*/ ctx[1].sunrise) / Math.abs(/*SUN*/ ctx[1].sunrise - /*SUN*/ ctx[1].sunset) * 100;
    			progressbar0.$set(progressbar0_changes);
    			const progressbar1_changes = {};
    			if (dirty & /*CURRENT_DATETIME*/ 1) progressbar1_changes.progress = ((/*CURRENT_DATETIME*/ ctx[0].getHours() + 1) * 60 + /*CURRENT_DATETIME*/ ctx[0].getMinutes()) / (24 * 60) * 100;
    			progressbar1.$set(progressbar1_changes);
    			const progressbar2_changes = {};

    			if (dirty & /*CURRENT_DATETIME*/ 1) progressbar2_changes.progress = (/*CURRENT_DATETIME*/ ctx[0].getDay() === 0
    			? 7
    			: /*CURRENT_DATETIME*/ ctx[0].getDay()) / 7 * 100;

    			progressbar2.$set(progressbar2_changes);
    			const progressbar3_changes = {};
    			if (dirty & /*CURRENT_DATETIME*/ 1) progressbar3_changes.progress = /*CURRENT_DATETIME*/ ctx[0].getDate() / new Date(/*CURRENT_DATETIME*/ ctx[0].getFullYear(), /*CURRENT_DATETIME*/ ctx[0].getMonth() + 1, 0).getDate() * 100;
    			progressbar3.$set(progressbar3_changes);
    			const progressbar4_changes = {};
    			if (dirty & /*CURRENT_DATETIME*/ 1) progressbar4_changes.progress = /*getDaysPassed*/ ctx[2]() / (/*CURRENT_DATETIME*/ ctx[0] % 4 == 0 ? 366 : 365) * 100;
    			progressbar4.$set(progressbar4_changes);
    			if ((!current || dirty & /*CURRENT_DATETIME*/ 1) && t16_value !== (t16_value = /*CURRENT_DATETIME*/ ctx[0].toLocaleString() + "")) set_data(t16, t16_value);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(closebutton.$$.fragment, local);
    			transition_in(progressbar0.$$.fragment, local);
    			transition_in(progressbar1.$$.fragment, local);
    			transition_in(progressbar2.$$.fragment, local);
    			transition_in(progressbar3.$$.fragment, local);
    			transition_in(progressbar4.$$.fragment, local);
    			transition_in(offcanvas.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(closebutton.$$.fragment, local);
    			transition_out(progressbar0.$$.fragment, local);
    			transition_out(progressbar1.$$.fragment, local);
    			transition_out(progressbar2.$$.fragment, local);
    			transition_out(progressbar3.$$.fragment, local);
    			transition_out(progressbar4.$$.fragment, local);
    			transition_out(offcanvas.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div14);
    			destroy_component(closebutton);
    			destroy_component(progressbar0);
    			destroy_component(progressbar1);
    			destroy_component(progressbar2);
    			destroy_component(progressbar3);
    			destroy_component(progressbar4);
    			destroy_component(offcanvas);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const SunCalc = require("suncalc");
    	let CURRENT_DATETIME = new Date();
    	let SUN = SunCalc.getTimes(CURRENT_DATETIME, 37.566536, 126.977966);

    	const getDaysPassed = () => {
    		const YEAR_START = new Date(CURRENT_DATETIME.getFullYear(), 0, 0);
    		const DIFF = CURRENT_DATETIME - YEAR_START + (YEAR_START.getTimezoneOffset() - CURRENT_DATETIME.getTimezoneOffset()) * 60 * 1000;
    		const ONE_DAY = 1000 * 60 * 60 * 24;
    		const day = Math.floor(DIFF / ONE_DAY);
    		return day;
    	};

    	onMount(() => {
    		console.log(SUN);

    		setInterval(
    			() => {
    				$$invalidate(0, CURRENT_DATETIME = new Date());
    			},
    			1000
    		);
    	});

    	const handleKeyUp = e => {
    		// this would test for whichever key is 40 (down arrow) and the ctrl key at the same time
    		if (e.ctrlKey && e.key === "t") {
    			// call your function to do the thing
    			console.log("screenOnTop");

    			window.ipcRenderer.send("screen-on-top");
    		}
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*CURRENT_DATETIME*/ 1) {
    			(((function () {
    				((CURRENT_DATETIME.getHours() + 1) * 60 + CURRENT_DATETIME.getMinutes()) / (24 * 60) * 100;
    			}))());
    		}
    	};

    	return [CURRENT_DATETIME, SUN, getDaysPassed, handleKeyUp];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
