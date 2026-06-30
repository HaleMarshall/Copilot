import {
  polarToCartesian,
  donutArc,
  linScale,
  niceMax,
  tokenHex,
} from "./geometry";

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error("FAIL:", name);
  } else {
    console.log("PASS:", name);
  }
}
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// polarToCartesian: 0° is 12 o'clock (straight up → y negative)
const p0 = polarToCartesian(0, 0, 10, 0);
ok("polar 0deg = top", near(p0.x, 0) && near(p0.y, -10));
const p90 = polarToCartesian(0, 0, 10, 90);
ok("polar 90deg = right", near(p90.x, 10) && near(p90.y, 0));

// linScale
ok("linScale midpoint", linScale(0, 10, 0, 100)(5) === 50);
ok("linScale start", linScale(0, 10, 0, 100)(0) === 0);
ok("linScale end", linScale(0, 10, 0, 100)(10) === 100);

// niceMax
ok("niceMax 187 -> 200", niceMax(187) === 200);
ok("niceMax 4.8 -> 5", niceMax(4.8) === 5);
ok("niceMax 0 -> 1", niceMax(0) === 1);

// donutArc returns a path string
const d = donutArc(50, 50, 40, 24, 0, 90);
ok("donutArc returns path", typeof d === "string" && d.startsWith("M") && d.includes("A"));

// tokenHex
ok("tokenHex over", tokenHex("over") === "#2D8F6F");
ok("tokenHex data-1", tokenHex("data-1") === "#2C2DFE");
ok("tokenHex passthrough", tokenHex("#abcdef") === "#abcdef");

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
} else {
  console.log("\nAll geometry tests passed");
}
