import { Suite, assertThat, assertThrows } from "../../TestUtil.js";
import { Complex } from "../../../src/engine/math/complex/Complex.js";
import {
  parseEntryRows,
  inspectComplexEntry,
} from "../../../src/components/math/structured-entry.js";

const suite = new Suite("Structured entry");
suite.test("preserves literal formulas and splits spreadsheet rows", () => {
  assertThat(parseEntryRows(" 1 + i\t sqrt(1/2)\r\ncos(90)\t(1-i) ")).isEqualTo(
    [
      ["1 + i", "sqrt(1/2)"],
      ["cos(90)", "(1-i)"],
    ],
  );
  assertThat(parseEntryRows("1,2;3,4")).isEqualTo([
    ["1", "2"],
    ["3", "4"],
  ]);
  assertThat(parseEntryRows("1\t0\n0\t1\n")).isEqualTo([
    ["1", "0"],
    ["0", "1"],
  ]);
  assertThat(parseEntryRows("(1, 2),3")).isEqualTo([["(1, 2)", "3"]]);
});
suite.test("accepts flat and nested bracket notation", () => {
  for (const source of ["[1, i]", "{1, i}"])
    assertThat(parseEntryRows(source)).isEqualTo([["1", "i"]]);
  for (const source of [
    "[[1,0],[0,1]]",
    "{{1,0},{0,1}}",
    "[ [1,0]; [0,1] ]",
    "[[1,0],\n[0,1]]",
    "[[1,0], \n [0,1]]",
    "[[1,0]\n[0,1]]",
  ])
    assertThat(parseEntryRows(source)).isEqualTo([
      ["1", "0"],
      ["0", "1"],
    ]);
});
suite.test("rejects malformed, empty and ragged rows", () => {
  for (const source of [
    "",
    "  ",
    "[]",
    "1,",
    ",1",
    "1;;2",
    "1,2\n3",
    "[1,2}",
    "[1,2",
    "1),2",
    "[[1,2],3]",
    "[[[1]]]",
    "[[1], , [2]]",
    "1\n\n2",
    "1\t",
    "\t1",
    "1\t\n0\t",
    "[[1\t],[2\t]]",
  ])
    assertThrows(() => parseEntryRows(source));
});
suite.test("bounds pasted text and cell count", () => {
  assertThrows(() => parseEntryRows("1".repeat(65537)));
  assertThrows(() =>
    parseEntryRows(Array.from({ length: 257 }, () => "1").join(",")),
  );
  assertThat(
    parseEntryRows(Array.from({ length: 256 }, () => "1").join(","))[0].length,
  ).isEqualTo(256);
});
suite.test("inspects complex expressions in degrees and finite values", () => {
  assertThat(inspectComplexEntry("1 + i").value).isEqualTo(new Complex(1, 1));
  assertThat(inspectComplexEntry("cos(90)").value.real).isApproximatelyEqualTo(
    0,
  );
  assertThat(inspectComplexEntry("1e-7").value.real).isApproximatelyEqualTo(
    1e-7,
  );
  assertThat(inspectComplexEntry("", { allowEmpty: true }).value).isEqualTo(
    Complex.ZERO,
  );
  for (const source of ["1/0", "unknown", "1)", "1+)"])
    assertThat(inspectComplexEntry(source).incomplete).isEqualTo(false);
});
suite.test("unfinished expressions never produce a value", () => {
  for (const source of [
    "",
    "1+",
    "(1+)",
    "sqrt(1/)",
    "(1",
    "()",
    "sqrt()",
    "1 cos",
    "1sqrt",
    "(1 cos)",
    "1 √",
    "1 SIN",
  ])
    assertThat(inspectComplexEntry(source).incomplete).isEqualTo(true);
});
