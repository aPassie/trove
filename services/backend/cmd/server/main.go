// backend http server entry — wires routes for parsing, agent, itr

package main

import (
	"log"
	"net/http"
	"os"

	"github.com/aPassie/trove/backend/internal/agent"
	"github.com/aPassie/trove/backend/internal/audit"
	"github.com/aPassie/trove/backend/internal/itr"
	"github.com/aPassie/trove/backend/internal/parsing"
	"github.com/aPassie/trove/backend/internal/redact"
	"github.com/aPassie/trove/backend/internal/storage"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8787"
	}

	store := storage.MustOpen(os.Getenv("NEON_DATABASE_URL"))
	auditor := audit.New(store, redact.New())
	analyst := agent.New(auditor)
	drafter := itr.NewDrafter()
	parser := parsing.New()

	mux := http.NewServeMux()
	mux.Handle("POST /parse/26as", parsing.Handler(parser))
	mux.Handle("POST /agent/analyse", agent.Handler(analyst))
	mux.Handle("POST /itr/draft", itr.Handler(drafter))

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
