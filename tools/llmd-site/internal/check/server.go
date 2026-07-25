package check

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

// Server runs HTTP serving for link/image checks.
type Server struct {
	cmd      *exec.Cmd
	static   *http.Server
	port     int
	host     string
	root     string
	buildDir string
	ready    chan struct{}
	stdout   io.ReadCloser
}

// StartServer starts an HTTP server for link/image checks.
func StartServer(repoRoot string, cfg Config) (*Server, error) {
	if cfg.ServeMode == "docusaurus" {
		return startDocusaurusServer(repoRoot, cfg)
	}
	return startStaticServer(cfg)
}

func startStaticServer(cfg Config) (*Server, error) {
	buildDir := cfg.BuildDir
	if _, err := os.Stat(buildDir); err != nil {
		return nil, fmt.Errorf("build directory not found: %w", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if resolved, ok := ResolveStaticBuildPath(buildDir, r.URL.Path); ok {
			http.ServeFile(w, r, resolved)
			return
		}
		notFound := filepath.Join(buildDir, "404.html")
		if f, err := os.Open(notFound); err == nil {
			defer f.Close()
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusNotFound)
			_, _ = io.Copy(w, f)
			return
		}
		http.NotFound(w, r)
	})

	addr := cfg.ServerHost + ":" + itoa(cfg.ServerPort)
	srv := &http.Server{Addr: addr, Handler: mux}
	ready := make(chan struct{})
	go func() {
		close(ready)
		_ = srv.ListenAndServe()
	}()
	<-ready

	client := newHTTPClient(2 * time.Second)
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		resp, err := client.Get("http://" + addr + "/")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode < 500 {
				return &Server{
					static:   srv,
					port:     cfg.ServerPort,
					host:     cfg.ServerHost,
					buildDir: buildDir,
				}, nil
			}
		}
		time.Sleep(50 * time.Millisecond)
	}
	_ = srv.Close()
	return nil, fmt.Errorf("static server start timeout")
}

func startDocusaurusServer(repoRoot string, cfg Config) (*Server, error) {
	s := &Server{
		port:  cfg.ServerPort,
		host:  cfg.ServerHost,
		root:  repoRoot,
		ready: make(chan struct{}),
	}

	cmd := exec.Command("npx", "docusaurus", "serve",
		"--port", itoa(cfg.ServerPort),
		"--no-open",
	)
	cmd.Dir = repoRoot
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}
	s.stdout = stdout
	s.cmd = cmd

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start docusaurus serve: %w", err)
	}

	go s.scanOutput(stdout, false)
	go s.scanOutput(stderr, true)

	select {
	case <-s.ready:
		client := newHTTPClient(2 * time.Second)
		deadline := time.Now().Add(5 * time.Second)
		for time.Now().Before(deadline) {
			resp, err := client.Get(s.BaseURL() + "/")
			if err == nil {
				resp.Body.Close()
				if resp.StatusCode < 500 {
					return s, nil
				}
			}
			time.Sleep(50 * time.Millisecond)
		}
		return s, nil
	case <-time.After(30 * time.Second):
		_ = s.Stop()
		return nil, fmt.Errorf("server start timeout")
	}
}

func (s *Server) scanOutput(r io.Reader, isErr bool) {
	scanner := bufio.NewScanner(r)
	var buf []string
	for scanner.Scan() {
		line := scanner.Text()
		buf = append(buf, line)
		if len(buf) > 50 {
			buf = buf[1:]
		}
		joined := ""
		for _, l := range buf {
			joined += l
		}
		if serverReady(joined) {
			select {
			case <-s.ready:
			default:
				close(s.ready)
			}
		}
		if isErr && !strings.Contains(line, "[WARNING]") && !strings.Contains(line, "DeprecationWarning") {
			fmt.Fprintln(os.Stderr, "Server:", line)
		}
	}
}

func serverReady(s string) bool {
	return strings.Contains(s, "Serving") || strings.Contains(s, "localhost:")
}

func (s *Server) Stop() error {
	if s.static != nil {
		fmt.Println("\n🛑 Stopping server...")
		return s.static.Close()
	}
	if s.cmd == nil || s.cmd.Process == nil {
		return nil
	}
	fmt.Println("\n🛑 Stopping server...")
	pgid, err := syscall.Getpgid(s.cmd.Process.Pid)
	if err == nil {
		_ = syscall.Kill(-pgid, syscall.SIGKILL)
	}
	_ = s.cmd.Process.Kill()
	_, _ = s.cmd.Process.Wait()
	return nil
}

func (s *Server) BaseURL() string {
	return "http://" + s.host + ":" + itoa(s.port)
}
