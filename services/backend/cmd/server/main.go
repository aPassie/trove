// backend http server entry — wires parsing, agent, and itr

package main

import (
	"log"
	"net/http"
	"os"

	"github.com/aPassie/trove/backend/internal/agent"
	"github.com/aPassie/trove/backend/internal/itr"
	"github.com/aPassie/trove/backend/internal/parsing"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8787"
	}

	parser := parsing.New()
	analyst := agent.New()
	drafter := itr.NewDrafter()

	mux := http.NewServeMux()
	mux.Handle("POST /parse/26as", parsing.Handler(parser))
	mux.Handle("POST /agent/analyse", agent.Handler(analyst))
	mux.Handle("POST /itr/draft", itr.Handler(drafter))

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
