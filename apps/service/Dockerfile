# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 go build -o /service ./cmd/server

# Runtime stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates
WORKDIR /app

COPY --from=builder /service .

EXPOSE 8080

ENTRYPOINT ["./service"]
