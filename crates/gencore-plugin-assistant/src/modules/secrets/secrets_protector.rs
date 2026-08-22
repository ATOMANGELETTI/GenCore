use super::secrets_error::SecretsError;

/// Protects secret bytes before they are written to the `secrets` table.
pub trait SecretProtector {
    fn protect(&self, plain: &[u8]) -> Result<Vec<u8>, SecretsError>;
    fn unprotect(&self, cipher: &[u8]) -> Result<Vec<u8>, SecretsError>;
}

/// Test mock: ciphertext equals plaintext.
pub struct IdentityProtector;

impl SecretProtector for IdentityProtector {
    fn protect(&self, plain: &[u8]) -> Result<Vec<u8>, SecretsError> {
        Ok(plain.to_vec())
    }

    fn unprotect(&self, cipher: &[u8]) -> Result<Vec<u8>, SecretsError> {
        Ok(cipher.to_vec())
    }
}

/// Windows DPAPI protector using `CryptProtectData` / `CryptUnprotectData`.
#[cfg(windows)]
pub struct DpapiProtector;

#[cfg(windows)]
impl SecretProtector for DpapiProtector {
    fn protect(&self, plain: &[u8]) -> Result<Vec<u8>, SecretsError> {
        crypt_protect(plain)
    }

    fn unprotect(&self, cipher: &[u8]) -> Result<Vec<u8>, SecretsError> {
        crypt_unprotect(cipher)
    }
}

#[cfg(windows)]
fn crypt_protect(plain: &[u8]) -> Result<Vec<u8>, SecretsError> {
    use windows::Win32::Security::Cryptography::{
        CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN, CryptProtectData,
    };

    let cb_data = u32::try_from(plain.len()).map_err(|_| SecretsError::Protect)?;
    let input = CRYPT_INTEGER_BLOB {
        cbData: cb_data,
        pbData: plain.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    // SAFETY: `input` points at `plain` for the call; `output` is a DPAPI
    // allocation copied then released with `LocalFree`.
    unsafe {
        CryptProtectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|_| SecretsError::Protect)?;
        copy_and_local_free(output, SecretsError::Protect)
    }
}

#[cfg(windows)]
fn crypt_unprotect(cipher: &[u8]) -> Result<Vec<u8>, SecretsError> {
    use windows::Win32::Security::Cryptography::{
        CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN, CryptUnprotectData,
    };

    let cb_data = u32::try_from(cipher.len()).map_err(|_| SecretsError::Unprotect)?;
    let input = CRYPT_INTEGER_BLOB {
        cbData: cb_data,
        pbData: cipher.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    // SAFETY: `input` points at `cipher` for the call; `output` is a DPAPI
    // allocation copied then released with `LocalFree`.
    unsafe {
        CryptUnprotectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|_| SecretsError::Unprotect)?;
        copy_and_local_free(output, SecretsError::Unprotect)
    }
}

#[cfg(windows)]
unsafe fn copy_and_local_free(
    blob: windows::Win32::Security::Cryptography::CRYPT_INTEGER_BLOB,
    on_null: SecretsError,
) -> Result<Vec<u8>, SecretsError> {
    use windows::Win32::Foundation::{HLOCAL, LocalFree};

    if blob.pbData.is_null() {
        return if blob.cbData == 0 {
            Ok(Vec::new())
        } else {
            Err(on_null)
        };
    }
    // SAFETY: `pbData` is a non-null DPAPI allocation of `cbData` bytes.
    let bytes = unsafe { std::slice::from_raw_parts(blob.pbData, blob.cbData as usize) }.to_vec();
    let _ = unsafe { LocalFree(Some(HLOCAL(blob.pbData.cast()))) };
    Ok(bytes)
}
