// backend http server entry — wires the parsing route

package main

import (
	"log"
	"net/http"
	"os"

	"github.com/aPassie/trove/backend/internal/parsing"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8787"
	}

	parser := parsing.New()

	mux := http.NewServeMux()
	mux.Handle("POST /parse/26as", parsing.Handler(parser))

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
