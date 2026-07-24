import React, { useRef, useCallback, useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import * as MediaLibrary from 'expo-media-library'
import { useUserStore } from '../src/stores/useUserStore'
import { useProgressStore } from '../src/stores/useProgressStore'
import { getModuleInfo } from '../src/data/moduleRegistry'
import { formatDate } from '../src/utils/helpers'
import { fetchPercentile } from '../src/lib/syncService'

export default function CertificateScreen() {
  const router = useRouter()
  const { userName, userId } = useUserStore()
  const { moduleResults, completedModules, isModuleFullyCompleted } = useProgressStore()
  const certificateRef = useRef<View>(null)
  const [realPercentile, setRealPercentile] = useState<number | null>(null)

  // Use the most recently completed module for certificate
  const latestModuleId = completedModules.length > 0 ? completedModules[completedModules.length - 1] : null
  const moduleResult = latestModuleId ? moduleResults[latestModuleId] : null
  const moduleInfo = latestModuleId ? getModuleInfo(latestModuleId) : undefined
  const allDone = latestModuleId ? isModuleFullyCompleted(latestModuleId) : false

  useEffect(() => {
    setRealPercentile(null)
    if (latestModuleId && moduleResult) {
      fetchPercentile(latestModuleId, moduleResult.percentage).then(p => {
        if (p !== null) setRealPercentile(p)
      })
    }
  }, [latestModuleId, moduleResult])

  if (!moduleResult || !moduleInfo || !allDone) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No certificate available</Text>
          <Text style={styles.errorSubtext}>Complete a module to generate a certificate</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const completionDate = formatDate(moduleResult.completedAt)

  const captureCertificate = useCallback(async (): Promise<string | null> => {
    if (!certificateRef.current) {
      Alert.alert('Error', 'Certificate view not ready. Please wait a moment and try again.')
      return null
    }
    try {
      // Wait for layout to fully complete before capturing
      await new Promise(resolve => setTimeout(resolve, 800))
      // Pass the ref object (not .current) — this is the correct react-native-view-shot API
      const uri = await captureRef(certificateRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      })
      return uri
    } catch (error) {
      console.error('Failed to capture certificate:', error)
      Alert.alert('Error', 'Failed to capture certificate. Please try again.')
      return null
    }
  }, [])

  const handleShare = async () => {
    try {
      const uri = await captureCertificate()
      if (!uri) return

      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Certificate',
        })
      } else {
        await Share.share({
          title: 'EVATS Certificate',
          message: `I completed the ${moduleInfo.title} module with a grade of ${moduleResult.grade}!`,
          url: uri,
        })
      }
    } catch (error) {
      console.error('Failed to share:', error)
      Alert.alert('Error', 'Failed to share certificate. Please try again.')
    }
  }

  const handleDownload = async () => {
    try {
      let status = 'granted'
      try {
        const perm = await MediaLibrary.requestPermissionsAsync()
        status = perm.status
      } catch (permError) {
        Alert.alert(
          'Download Unavailable',
          'Media library access is not available in Expo Go on Android.\n\nUse the Share button to save the certificate instead.',
        )
        return
      }

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save the certificate to your device.')
        return
      }

      const uri = await captureCertificate()
      if (!uri) return

      const asset = await MediaLibrary.createAssetAsync(uri)
      const album = await MediaLibrary.getAlbumAsync('EVATS Certificates')
      
      if (album == null) {
        await MediaLibrary.createAlbumAsync('EVATS Certificates', asset, false)
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false)
      }

      Alert.alert('Downloaded!', 'Certificate saved to your Photos under "EVATS Certificates" album.')
    } catch (error) {
      console.error('Failed to download:', error)
      Alert.alert('Error', 'Failed to download certificate. Please use the Share button instead.')
    }
  }

  const getBadgeEmoji = (grade: string) => {
    switch (grade) {
      case 'A+':
        return '🥇'
      case 'A':
        return '🥈'
      case 'B':
        return '🥉'
      default:
        return '🎓'
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.certificateContainer} ref={certificateRef} collapsable={false}>
          <View style={styles.certificate}>
            <View style={styles.certificateBorder}>
              <View style={styles.certificateInner}>
                {/* Header */}
                <View style={styles.certificateHeader}>
                  <Text style={styles.certificateBadge}>{getBadgeEmoji(moduleResult.grade)}</Text>
                  <Text style={styles.certificateTitle}>CERTIFICATE</Text>
                  <Text style={styles.certificateSubtitle}>OF COMPLETION</Text>
                </View>

                {/* Body */}
                <View style={styles.certificateBody}>
                  <Text style={styles.presentedTo}>This is to certify that</Text>
                  
                  <Text style={styles.userName}>{userName}</Text>
                  <Text style={styles.userId}>ID: {userId}</Text>

                  <Text style={styles.hasCompleted}>has successfully completed</Text>
                  
                  <Text style={styles.moduleName}>{moduleInfo.title}</Text>
                  <Text style={styles.moduleDescription}>{moduleInfo.shortDescription}</Text>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Grade</Text>
                      <Text style={styles.statValue}>{moduleResult.grade}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Score</Text>
                      <Text style={styles.statValue}>{moduleResult.percentage.toFixed(0)}%</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Percentile</Text>
                      <Text style={styles.statValue}>
                        {realPercentile === null ? '—' : `${realPercentile}th`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pointsContainer}>
                    <Text style={styles.pointsText}>
                      {moduleResult.score} Points Earned
                    </Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.certificateFooter}>
                  <Text style={styles.dateText}>{completionDate}</Text>
                  <Text style={styles.programText}>
                    EVATS - Electric Vehicle Advanced Training System
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About This Certificate</Text>
          <Text style={styles.infoText}>
            This certificate validates your understanding of the {moduleInfo.title} module. 
            It can be shared with supervisors and used for professional development records.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>📤 Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
          <Text style={styles.downloadButtonText}>💾 Download</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  certificateContainer: {
    padding: 16,
  },
  certificate: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  certificateBorder: {
    borderWidth: 8,
    borderColor: '#1a1a1a',
    borderRadius: 12,
  },
  certificateInner: {
    padding: 24,
  },
  certificateHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  certificateBadge: {
    fontSize: 48,
    marginBottom: 8,
  },
  certificateTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    letterSpacing: 4,
  },
  certificateSubtitle: {
    fontSize: 14,
    color: '#666',
    letterSpacing: 2,
    marginTop: 4,
  },
  certificateBody: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  presentedTo: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
  },
  hasCompleted: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  moduleName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  pointsContainer: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FFF3E0',
    borderRadius: 24,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  certificateFooter: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  programText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  downloadButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
