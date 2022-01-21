
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

    /* src\components\ProgressBar.svelte generated by Svelte v3.46.2 */

    function create_fragment$1(ctx) {
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

    function instance$1($$self, $$props, $$invalidate) {
    	let { progress = 10 } = $$props;

    	$$self.$$set = $$props => {
    		if ('progress' in $$props) $$invalidate(0, progress = $$props.progress);
    	};

    	return [progress];
    }

    class ProgressBar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { progress: 0 });
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.2 */

    function create_fragment(ctx) {
    	let div13;
    	let main;
    	let div12;
    	let div1;
    	let div0;
    	let t0;
    	let div4;
    	let div3;
    	let t2;
    	let progressbar0;
    	let t3;
    	let div6;
    	let div5;
    	let t5;
    	let progressbar1;
    	let t6;
    	let div8;
    	let div7;
    	let t8;
    	let progressbar2;
    	let t9;
    	let div10;
    	let div9;
    	let t11;
    	let progressbar3;
    	let t12;
    	let div11;
    	let t13_value = /*CURRENT_DATETIME*/ ctx[0].toLocaleString() + "";
    	let t13;
    	let current;
    	let mounted;
    	let dispose;

    	progressbar0 = new ProgressBar({
    			props: {
    				progress: ((/*CURRENT_DATETIME*/ ctx[0].getHours() + 1) * 60 + /*CURRENT_DATETIME*/ ctx[0].getMinutes()) / (24 * 60) * 100
    			}
    		});

    	progressbar1 = new ProgressBar({
    			props: {
    				progress: (/*CURRENT_DATETIME*/ ctx[0].getDay() === 0
    				? 7
    				: /*CURRENT_DATETIME*/ ctx[0].getDay() / 7) * 100
    			}
    		});

    	progressbar2 = new ProgressBar({
    			props: {
    				progress: /*CURRENT_DATETIME*/ ctx[0].getDate() / new Date(/*CURRENT_DATETIME*/ ctx[0].getFullYear(), /*CURRENT_DATETIME*/ ctx[0].getMonth() + 1, 0).getDate() * 100
    			}
    		});

    	progressbar3 = new ProgressBar({
    			props: {
    				progress: /*getDaysPassed*/ ctx[1]() / (/*CURRENT_DATETIME*/ ctx[0] % 4 == 0 ? 366 : 365) * 100
    			}
    		});

    	return {
    		c() {
    			div13 = element("div");
    			main = element("main");
    			div12 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
    			t0 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div3.innerHTML = `<div>Today</div>`;
    			t2 = space();
    			create_component(progressbar0.$$.fragment);
    			t3 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div5.textContent = "This week";
    			t5 = space();
    			create_component(progressbar1.$$.fragment);
    			t6 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div7.textContent = "This month";
    			t8 = space();
    			create_component(progressbar2.$$.fragment);
    			t9 = space();
    			div10 = element("div");
    			div9 = element("div");
    			div9.textContent = "This year";
    			t11 = space();
    			create_component(progressbar3.$$.fragment);
    			t12 = space();
    			div11 = element("div");
    			t13 = text(t13_value);
    			attr(div1, "class", "flex absolute");
    			set_style(div1, "margin-left", "70vw");
    			set_style(div1, "-webkit-app-region", "no-drag");
    			attr(div3, "class", "my-1");
    			attr(div4, "class", "text-left");
    			attr(div5, "class", "my-1");
    			attr(div6, "class", "text-left");
    			attr(div7, "class", "my-1");
    			attr(div8, "class", "text-left");
    			attr(div9, "class", "my-1");
    			attr(div10, "class", "text-left");
    			attr(div11, "class", "mt-4");
    			attr(div12, "class", "m-auto");
    			attr(main, "class", "h-screen flex justify-center items-center text-white svelte-1cp0utu");
    			attr(div13, "class", "min-h-screen min-w-screen bg-stone-900");
    		},
    		m(target, anchor) {
    			insert(target, div13, anchor);
    			append(div13, main);
    			append(main, div12);
    			append(div12, div1);
    			append(div1, div0);
    			append(div12, t0);
    			append(div12, div4);
    			append(div4, div3);
    			append(div4, t2);
    			mount_component(progressbar0, div4, null);
    			append(div12, t3);
    			append(div12, div6);
    			append(div6, div5);
    			append(div6, t5);
    			mount_component(progressbar1, div6, null);
    			append(div12, t6);
    			append(div12, div8);
    			append(div8, div7);
    			append(div8, t8);
    			mount_component(progressbar2, div8, null);
    			append(div12, t9);
    			append(div12, div10);
    			append(div10, div9);
    			append(div10, t11);
    			mount_component(progressbar3, div10, null);
    			append(div12, t12);
    			append(div12, div11);
    			append(div11, t13);
    			current = true;

    			if (!mounted) {
    				dispose = listen(div0, "click", /*click_handler*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			const progressbar0_changes = {};
    			if (dirty & /*CURRENT_DATETIME*/ 1) progressbar0_changes.progress = ((/*CURRENT_DATETIME*/ ctx[0].getHours() + 1) * 60 + /*CURRENT_DATETIME*/ ctx[0].getMinutes()) / (24 * 60) * 100;
    			progressbar0.$set(progressbar0_changes);
    			const progressbar1_changes = {};

    			if (dirty & /*CURRENT_DATETIME*/ 1) progressbar1_changes.progress = (/*CURRENT_DATETIME*/ ctx[0].getDay() === 0
    			? 7
    			: /*CURRENT_DATETIME*/ ctx[0].getDay() / 7) * 100;

    			progressbar1.$set(progressbar1_changes);
    			const progressbar2_changes = {};
    			if (dirty & /*CURRENT_DATETIME*/ 1) progressbar2_changes.progress = /*CURRENT_DATETIME*/ ctx[0].getDate() / new Date(/*CURRENT_DATETIME*/ ctx[0].getFullYear(), /*CURRENT_DATETIME*/ ctx[0].getMonth() + 1, 0).getDate() * 100;
    			progressbar2.$set(progressbar2_changes);
    			const progressbar3_changes = {};
    			if (dirty & /*CURRENT_DATETIME*/ 1) progressbar3_changes.progress = /*getDaysPassed*/ ctx[1]() / (/*CURRENT_DATETIME*/ ctx[0] % 4 == 0 ? 366 : 365) * 100;
    			progressbar3.$set(progressbar3_changes);
    			if ((!current || dirty & /*CURRENT_DATETIME*/ 1) && t13_value !== (t13_value = /*CURRENT_DATETIME*/ ctx[0].toLocaleString() + "")) set_data(t13, t13_value);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(progressbar0.$$.fragment, local);
    			transition_in(progressbar1.$$.fragment, local);
    			transition_in(progressbar2.$$.fragment, local);
    			transition_in(progressbar3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(progressbar0.$$.fragment, local);
    			transition_out(progressbar1.$$.fragment, local);
    			transition_out(progressbar2.$$.fragment, local);
    			transition_out(progressbar3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div13);
    			destroy_component(progressbar0);
    			destroy_component(progressbar1);
    			destroy_component(progressbar2);
    			destroy_component(progressbar3);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let CURRENT_DATETIME = new Date();

    	const getDaysPassed = () => {
    		const YEAR_START = new Date(CURRENT_DATETIME.getFullYear(), 0, 0);
    		const DIFF = CURRENT_DATETIME - YEAR_START + (YEAR_START.getTimezoneOffset() - CURRENT_DATETIME.getTimezoneOffset()) * 60 * 1000;
    		const ONE_DAY = 1000 * 60 * 60 * 24;
    		const day = Math.floor(DIFF / ONE_DAY);
    		return day;
    	};

    	onMount(() => {
    		setInterval(
    			() => {
    				$$invalidate(0, CURRENT_DATETIME = new Date());
    			},
    			1000
    		);
    	});

    	const click_handler = () => {
    		console.log("toggle");
    		window.ipcRenderer.send("toggle-window");
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*CURRENT_DATETIME*/ 1) {
    			(((function () {
    				((CURRENT_DATETIME.getHours() + 1) * 60 + CURRENT_DATETIME.getMinutes()) / (24 * 60) * 100;
    				console.log("hello");
    			}))());
    		}
    	};

    	return [CURRENT_DATETIME, getDaysPassed, click_handler];
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
