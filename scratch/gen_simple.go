package main; import ("fmt"; "golang.org/x/crypto/bcrypt"); func main() { p := "password123"; h, _ := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost); fmt.Println(string(h)) }
