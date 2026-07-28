import api from "../api";


export async function loginUser(loginPayload: loginPayload){
    const res = await api.post("/api/v1/auth/login", loginPayload)
    return res.data
}
 
export async function registerUser(signUpPayload: SignUp){
    const res = await api.post("/api/v1/auth/register", signUpPayload)
    return res.data
}
export async function uploadSignInImage(image: File){
    const formData = new FormData()
    formData.append("file", image)
    const res = await api.post("/api/v1/profile/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data
}
