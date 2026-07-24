export async function validateKey(apikey){
    const res = await fetch('http://localhost:3000/auth/verify-key',{
        method : 'POST',
        headers : {
            'Authorization' : `Bearer ${apikey}`
        }
    });

    const data = await res.json()
    return data
}