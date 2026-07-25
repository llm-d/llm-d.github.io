package cmd

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/llm-d/llm-d.github.io/tools/llmd-site/internal/blog"
	"github.com/spf13/cobra"
)

func newBlogCmd() *cobra.Command {
	var (
		dateStr string
		timeStr string
		rename  bool
		dryRun  bool
	)

	cmd := &cobra.Command{
		Use:   "blog",
		Short: "Blog post utilities",
	}

	stamp := &cobra.Command{
		Use:   "stamp [files...]",
		Short: "Set frontmatter date to publish date for blog posts",
		Long: `Update the date field in blog post YAML frontmatter.

Used on merge to main so posts show the publication date rather than the
draft date chosen in the PR. Optionally renames YYYY-MM-DD_slug.md files
to match the new date prefix.

Examples:
  llmd-site blog stamp blog/2026-03-13_foo.md
  llmd-site blog stamp --dry-run blog/new-post.md
  llmd-site blog stamp --date 2026-07-01 blog/my-post.md`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 {
				return fmt.Errorf("pass at least one blog markdown file")
			}

			when, err := parseStampDate(dateStr)
			if err != nil {
				return err
			}

			opts := blog.StampOptions{
				When:      when,
				TimeOfDay: timeStr,
				Rename:    rename,
				DryRun:    dryRun,
			}

			var paths []string
			for _, arg := range args {
				p := arg
				if !filepath.IsAbs(p) {
					p = filepath.Join(rootDir, p)
				}
				paths = append(paths, p)
			}

			results, err := blog.StampFiles(paths, opts)
			if err != nil {
				return err
			}

			changed := 0
			for _, r := range results {
				switch {
				case r.Skipped:
					fmt.Printf("skip %s (%s)\n", r.Path, r.Reason)
				case r.Changed:
					changed++
					if r.NewPath != r.Path {
						fmt.Printf("stamp %s -> %s\n", r.Path, r.NewPath)
					} else {
						fmt.Printf("stamp %s\n", r.Path)
					}
				}
			}

			if dryRun {
				fmt.Printf("dry run: would update %d file(s)\n", changed)
				return nil
			}
			fmt.Printf("✓ updated %d blog post(s)\n", changed)
			return nil
		},
	}

	stamp.Flags().StringVar(&dateStr, "date", "", "publish date (YYYY-MM-DD, default today UTC)")
	stamp.Flags().StringVar(&timeStr, "time", "09:00", "time suffix for date field (HH:MM)")
	stamp.Flags().BoolVar(&rename, "rename", true, "rename YYYY-MM-DD_*.md files to match publish date")
	stamp.Flags().BoolVar(&dryRun, "dry-run", false, "print changes without writing files")

	cmd.AddCommand(stamp)
	return cmd
}

func parseStampDate(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Time{}, nil
	}
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid --date %q (use YYYY-MM-DD): %w", dateStr, err)
	}
	return t.UTC(), nil
}
