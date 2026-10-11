export const PLACEHOLDER = "https://avatars.mds.yandex.net/i?id=1ec2be5f5c8019aab21120b9331bd767ea43c172-17636413-images-thumbs&n=13";

export const onImageError = (e) => { e.target.onerror = null; e.target.src = PLACEHOLDER; };