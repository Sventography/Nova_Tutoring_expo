import React, { useState } from 'react'
import { View } from 'react-native'
import Toast from './Toast'
import { setToastRef } from '../lib/toastRef'

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible,setVisible]=useState(false)
  const [title,setTitle]=useState('')
  const [points,setPoints]=useState(0)

  const show=(t:string,p:number)=>{
    setTitle(t); setPoints(p); setVisible(true)
  }

  setToastRef(show)

  return(
    <View style={{flex:1}}>
      {children}
      <Toast visible={visible} title={title} points={points} onHide={()=>setVisible(false)}/>
    </View>
  )
}
