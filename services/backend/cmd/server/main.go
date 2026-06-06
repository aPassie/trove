package main

import (
	"crypto/subtle"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aPassie/trove/backend/internal/agent"
	"github.com/aPassie/trove/backend/internal/audit"
	"github.com/aPassie/trove/backend/internal/gemini"
	"github.com/aPassie/trove/backend/internal/itr"
	"github.com/aPassie/trove/backend/internal/parsing"
	"github.com/aPassie/trove/backend/internal/redact"
	"github.com/aPassie/trove/backend/internal/storage"
)

const maxBodyBytes = 1 << 20

func withGuards(token string, h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if token != "" {
			got := r.Header.Get("Authorization")
			want := "Bearer " + token
			if subtle.ConstantTimeCompare([]byte(got), []byte(want)) != 1 {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
		}
		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		h.ServeHTTP(w, r)
	})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8787"
	}

	token := os.Getenv("INTERNAL_API_TOKEN")
	if token == "" {
		log.Println("warning: INTERNAL_API_TOKEN is not set — backend endpoints are UNAUTHENTICATED (dev only)")
	}

	var store *storage.Store
	if dsn := os.Getenv("NEON_DATABASE_URL"); dsn != "" {
		store = storage.MustOpen(dsn)
	}
	auditor := audit.New(store, redact.New())
	llm := gemini.New(os.Getenv("GEMINI_API_KEY"), os.Getenv("GEMINI_GATEWAY_URL"))
	analyst := agent.New(auditor, llm)
	drafter := itr.NewDrafter()
	parser := parsing.New()

	mux := http.NewServeMux()
	mux.Handle("POST /parse/26as", withGuards(token, parsing.Handler(parser)))
	mux.Handle("POST /agent/analyse", withGuards(token, agent.Handler(analyst)))
	mux.Handle("POST /itr/draft", withGuards(token, itr.Handler(drafter)))

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
