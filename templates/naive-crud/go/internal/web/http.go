package web

type Request struct {
	Method string
	Path   string
	Body   string
}

type Response struct {
	Status int
	Body   string
}
