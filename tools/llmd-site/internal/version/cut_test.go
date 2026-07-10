package version

import "testing"

func TestNormalizeLabel(t *testing.T) {
	tests := []struct {
		in    string
		want  string
		valid bool
	}{
		{"0.8", "0.8", true},
		{"0.8.0", "0.8", true},
		{"0.9.1", "0.9", true},
		{"v0.8", "", false},
		{"", "", false},
	}
	for _, tc := range tests {
		got, err := NormalizeLabel(tc.in)
		if tc.valid {
			if err != nil {
				t.Fatalf("NormalizeLabel(%q): unexpected error: %v", tc.in, err)
			}
			if got != tc.want {
				t.Fatalf("NormalizeLabel(%q) = %q, want %q", tc.in, got, tc.want)
			}
		} else if err == nil {
			t.Fatalf("NormalizeLabel(%q): expected error", tc.in)
		}
	}
}
