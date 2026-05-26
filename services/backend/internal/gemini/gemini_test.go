package gemini

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNew_EmptyKey_ReturnsNil(t *testing.T) {
	if New("", "https://example.com") != nil {
		t.Error("expected nil with empty key")
	}
}

func TestNew_EmptyURL_ReturnsNil(t *testing.T) {
	if New("k", "") != nil {
		t.Error("expected nil with empty url")
	}
}

func TestGenerate_NilClient(t *testing.T) {
	var c *Client
	_, err := c.Generate(context.Background(), "hi")
	if err == nil {
		t.Error("expected error from nil client")
	}
}

func TestGenerate_Success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-goog-api-key") != "secret" {
			t.Errorf("api key not forwarded: %q", r.Header.Get("x-goog-api-key"))
		}
		body, _ := io.ReadAll(r.Body)
		var req struct {
			Contents []struct {
				Parts []struct{ Text string }
			}
		}
		_ = json.Unmarshal(body, &req)
		if len(req.Contents) == 0 || req.Contents[0].Parts[0].Text == "" {
			t.Error("prompt not sent")
		}
		_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"one calm sentence."}]}}]}`))
	}))
	defer srv.Close()

	c := New("secret", srv.URL)
	out, err := c.Generate(context.Background(), "prompt please")
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if out != "one calm sentence." {
		t.Errorf("response: %q", out)
	}
}

func TestGenerate_Non200(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(401)
	}))
	defer srv.Close()

	_, err := New("k", srv.URL).Generate(context.Background(), "x")
	if err == nil || !strings.Contains(err.Error(), "401") {
		t.Errorf("expected 401 error, got %v", err)
	}
}

func TestGenerate_EmptyCandidates(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"candidates":[]}`))
	}))
	defer srv.Close()

	_, err := New("k", srv.URL).Generate(context.Background(), "x")
	if err == nil || !strings.Contains(err.Error(), "empty") {
		t.Errorf("expected empty error, got %v", err)
	}
}

func TestGenerate_MalformedResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`not json`))
	}))
	defer srv.Close()

	_, err := New("k", srv.URL).Generate(context.Background(), "x")
	if err == nil {
		t.Error("expected json decode error")
	}
}
