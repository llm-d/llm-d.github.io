package build

import "testing"

func TestCompareVersion(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"0.7.0", "0.7.1", -1},
		{"0.7.1", "0.7.0", 1},
		{"0.7.0", "0.7.0", 0},
		{"0.10.0", "0.9.0", 1},
		{"1.0.0", "0.99.0", 1},
	}
	for _, tc := range cases {
		got := compareVersion(tc.a, tc.b)
		if got != tc.want {
			t.Errorf("compareVersion(%q, %q) = %d, want %d", tc.a, tc.b, got, tc.want)
		}
	}
}
